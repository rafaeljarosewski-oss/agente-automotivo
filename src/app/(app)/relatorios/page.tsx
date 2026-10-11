import Link from "next/link";

import { BotaoCSV } from "@/components/comum/botao-csv";
import { Cabecalho } from "@/components/comum/cabecalho";
import { StatusNota } from "@/components/comum/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { periodoPadrao, relatorioComissoes, relatorioFaturamento, relatorioNotas, relatorioVendidos, type TipoRelatorio } from "@/lib/consultas/relatorios";
import { formatarData, formatarDataHora, somarDias } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_TIPO_NOTA } from "@/lib/dominio/rotulos";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { GraficoFaturamento } from "./grafico";

export const metadata = { title: "Relatórios" };

const ABAS: { id: TipoRelatorio; titulo: string }[] = [
  { id: "faturamento", titulo: "Faturamento" },
  { id: "vendidos", titulo: "Mais vendidos" },
  { id: "comissoes", titulo: "Comissões" },
  { id: "notas", titulo: "Notas emitidas" },
];

export default async function PaginaRelatorios({ searchParams }: { searchParams: Promise<{ tipo?: string; inicio?: string; fim?: string }> }) {
  await exigirSessao("admin");
  const sp = await searchParams;
  const tipo = (ABAS.find((a) => a.id === sp.tipo)?.id ?? "faturamento") as TipoRelatorio;
  const { inicio, fim } = periodoPadrao(sp.inicio, sp.fim);
  const supabase = await criarClienteServidor();
  const qs = (t: string) => `?tipo=${t}&inicio=${inicio}&fim=${fim}`;

  let conteudo: React.ReactNode;
  if (tipo === "faturamento") {
    const dias = await relatorioFaturamento(supabase, inicio, fim);
    const totalFat = dias.reduce((s, d) => s + d.faturado_centavos, 0);
    const totalRec = dias.reduce((s, d) => s + d.recebido_centavos, 0);
    const totalOS = dias.reduce((s, d) => s + d.quantidade_os, 0);
    // Todos os dias do período (inclusive sem movimento), para o eixo do gráfico ser contínuo
    const porDia = new Map(dias.map((d) => [d.dia, d]));
    const serieDiaria: { dia: string; valor: number; os: number }[] = [];
    for (let d = inicio; d <= fim && serieDiaria.length < 400; d = somarDias(d, 1)) {
      serieDiaria.push({ dia: d, valor: porDia.get(d)?.faturado_centavos ?? 0, os: porDia.get(d)?.quantidade_os ?? 0 });
    }
    conteudo = (
      <div className="grid gap-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Faturado (OS concluídas)", formatarMoeda(totalFat)],
            ["Recebido", formatarMoeda(totalRec)],
            ["Ticket médio", formatarMoeda(totalOS ? Math.round(totalFat / totalOS) : 0)],
          ].map(([t, v]) => (
            <Card key={t} className="gap-1 py-4">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground">{t}</p>
                <p className="text-2xl font-semibold">{v}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoFaturamento dias={serieDiaria} />
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Dia</TableHead>
                  <TableHead className="text-right">OS</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                  <TableHead className="pr-5 text-right">Recebido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dias
                  .filter((d) => d.quantidade_os || d.recebido_centavos)
                  .map((d) => (
                    <TableRow key={d.dia}>
                      <TableCell className="pl-5">{formatarData(d.dia)}</TableCell>
                      <TableCell className="text-right">{d.quantidade_os}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(d.faturado_centavos)}</TableCell>
                      <TableCell className="pr-5 text-right">{formatarMoeda(d.recebido_centavos)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-5">Total</TableCell>
                  <TableCell className="text-right">{totalOS}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(totalFat)}</TableCell>
                  <TableCell className="pr-5 text-right">{formatarMoeda(totalRec)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  } else if (tipo === "vendidos") {
    const linhas = await relatorioVendidos(supabase, inicio, fim);
    const max = Math.max(1, ...linhas.map((l) => l.total_centavos));
    conteudo = (
      <div className="grid gap-6 lg:grid-cols-2">
        {(["servico", "produto"] as const).map((t) => (
          <Card key={t} className="py-0">
            <CardHeader className="pt-5">
              <CardTitle>{t === "servico" ? "Serviços" : "Produtos"}</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Item</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="pr-5 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas
                    .filter((l) => l.tipo === t)
                    .map((l) => (
                      <TableRow key={`${l.referencia_id}-${l.descricao}`}>
                        <TableCell className="pl-5 whitespace-normal">
                          {l.descricao}
                          <div className="mt-1 h-1.5 rounded-full bg-primary" style={{ width: `${(l.total_centavos / max) * 100}%` }} aria-hidden />
                        </TableCell>
                        <TableCell className="text-right">{l.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="pr-5 text-right">{formatarMoeda(l.total_centavos)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  } else if (tipo === "comissoes") {
    const linhas = await relatorioComissoes(supabase, inicio, fim);
    conteudo = (
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Instalador</TableHead>
                <TableHead className="text-right">OS</TableHead>
                <TableHead className="text-right">Itens</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="pr-5 text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => (
                <TableRow key={l.instalador_id}>
                  <TableCell className="pl-5 font-medium">{l.instalador_nome}</TableCell>
                  <TableCell className="text-right">{l.quantidade_os}</TableCell>
                  <TableCell className="text-right">{l.quantidade_itens}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(l.base_centavos)}</TableCell>
                  <TableCell className="pr-5 text-right font-semibold">{formatarMoeda(l.comissao_centavos)}</TableCell>
                </TableRow>
              ))}
              {!linhas.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    Nenhuma comissão no período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  } else {
    const notas = await relatorioNotas(supabase, inicio, fim);
    const autorizadas = notas.filter((n) => n.status === "autorizada");
    conteudo = (
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {(["nfse", "nfce", "nfe"] as const).map((t) => (
            <Card key={t} className="gap-1 py-4">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground">{ROTULO_TIPO_NOTA[t]} autorizadas</p>
                <p className="text-2xl font-semibold">{formatarMoeda(autorizadas.filter((n) => n.tipo === t).reduce((s, n) => s + n.valor_total_centavos, 0))}</p>
                <p className="text-xs text-muted-foreground">{autorizadas.filter((n) => n.tipo === t).length} nota(s)</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Nota</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="hidden md:table-cell">Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="pr-5">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="pl-5">
                      <Link href={`/notas/${n.id}`} className="hover:underline">
                        {ROTULO_TIPO_NOTA[n.tipo]} {n.numero ?? ""}
                      </Link>
                    </TableCell>
                    <TableCell>{formatarDataHora(n.data_emissao ?? n.created_at)}</TableCell>
                    <TableCell className="hidden md:table-cell">{n.cliente ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatarMoeda(n.valor_total_centavos)}</TableCell>
                    <TableCell className="pr-5">
                      <StatusNota status={n.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Cabecalho titulo="Relatórios" descricao={`Período: ${formatarData(inicio)} a ${formatarData(fim)}`}>
        <BotaoCSV href={`/api/csv/relatorio/${tipo}?inicio=${inicio}&fim=${fim}`} />
      </Cabecalho>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Relatórios">
          {ABAS.map((a) => (
            <Link key={a.id} href={`/relatorios${qs(a.id)}`} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap", tipo === a.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {a.titulo}
            </Link>
          ))}
        </nav>
        <form className="flex flex-wrap items-end gap-2" action="/relatorios">
          <input type="hidden" name="tipo" value={tipo} />
          <label className="grid gap-1 text-xs">
            De
            <Input type="date" name="inicio" defaultValue={inicio} className="w-40" />
          </label>
          <label className="grid gap-1 text-xs">
            Até
            <Input type="date" name="fim" defaultValue={fim} className="w-40" />
          </label>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
        </form>
      </div>
      {conteudo}
    </>
  );
}
