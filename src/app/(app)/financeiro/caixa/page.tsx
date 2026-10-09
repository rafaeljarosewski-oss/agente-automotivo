import { Cabecalho } from "@/components/comum/cabecalho";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarDataHora } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/dominio/rotulos";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { AberturaCaixa, OperacoesCaixa } from "./operacoes";

export const metadata = { title: "Caixa do dia" };

const ROTULO_MOV = { abertura: "Abertura", sangria: "Sangria", reforco: "Reforço", recebimento: "Recebimento", pagamento: "Pagamento" } as const;

export default async function PaginaCaixa() {
  await exigirSessao("admin", "atendente");
  const supabase = await criarClienteServidor();
  const { data: aberto } = await supabase.from("caixas").select("*").eq("status", "aberto").maybeSingle();
  const [{ data: movimentos }, { data: resumo }, { data: anteriores }, { data: perfis }] = await Promise.all([
    aberto ? supabase.from("caixa_movimentos").select("*").eq("caixa_id", aberto.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    aberto ? supabase.rpc("resumo_caixa", { p_caixa: aberto.id }) : Promise.resolve({ data: [] }),
    supabase.from("caixas").select("*").eq("status", "fechado").order("fechado_em", { ascending: false }).limit(15),
    supabase.from("perfis").select("id, nome"),
  ]);
  const nome = (id: string | null) => perfis?.find((p) => p.id === id)?.nome ?? "—";
  const resumoComValor = (resumo ?? []).filter((r) => r.entradas || r.saidas);

  return (
    <>
      <Cabecalho titulo="Caixa do dia" descricao={aberto ? `Aberto em ${formatarDataHora(aberto.aberto_em)} por ${nome(aberto.aberto_por)}` : "Nenhum caixa aberto."} />
      {!aberto ? (
        <AberturaCaixa />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="grid gap-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {(resumoComValor.length ? resumoComValor : (resumo ?? []).filter((r) => r.forma_pagamento === "dinheiro")).map((r) => (
                <Card key={r.forma_pagamento} className="gap-1 py-4">
                  <CardContent className="px-4">
                    <p className="text-xs text-muted-foreground">{ROTULO_FORMA_PAGAMENTO[r.forma_pagamento]}</p>
                    <p className="text-xl font-semibold" data-testid={`saldo-${r.forma_pagamento}`}>
                      {formatarMoeda(r.esperado)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      entradas {formatarMoeda(r.entradas)} · saídas {formatarMoeda(r.saidas)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="py-0">
              <CardHeader className="pt-5">
                <CardTitle>Movimentos</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead className="pr-5 text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentos?.map((m) => {
                      const saida = m.tipo === "sangria" || m.tipo === "pagamento";
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="pl-5">{formatarDataHora(m.created_at).slice(-5)}</TableCell>
                          <TableCell>
                            <Badge variant={saida ? "danger" : "success"}>{ROTULO_MOV[m.tipo]}</Badge>
                          </TableCell>
                          <TableCell className="hidden whitespace-normal sm:table-cell">{m.descricao}</TableCell>
                          <TableCell>{ROTULO_FORMA_PAGAMENTO[m.forma_pagamento]}</TableCell>
                          <TableCell className={cn("pr-5 text-right font-medium", saida && "text-destructive")}>
                            {saida ? "− " : ""}
                            {formatarMoeda(m.valor_centavos)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!movimentos?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                          Nenhum movimento ainda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <OperacoesCaixa resumo={(resumo ?? []).map((r) => ({ forma: r.forma_pagamento, esperado: r.esperado }))} />
        </div>
      )}

      <Card className="mt-6 py-0">
        <CardHeader className="pt-5">
          <CardTitle>Caixas anteriores</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Abertura</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead className="hidden md:table-cell">Conferência</TableHead>
                <TableHead className="pr-5 text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anteriores?.map((c) => {
                const conf = (c.conferencia ?? {}) as Record<string, { esperado: number; informado: number; diferenca: number }>;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="pl-5">
                      {formatarDataHora(c.aberto_em)}
                      <span className="block text-xs text-muted-foreground">{nome(c.aberto_por)}</span>
                    </TableCell>
                    <TableCell>
                      {formatarDataHora(c.fechado_em)}
                      <span className="block text-xs text-muted-foreground">{nome(c.fechado_por)}</span>
                    </TableCell>
                    <TableCell className="hidden text-xs whitespace-normal md:table-cell">
                      {Object.entries(conf)
                        .filter(([, v]) => v.esperado || v.informado)
                        .map(([f, v]) => `${ROTULO_FORMA_PAGAMENTO[f as keyof typeof ROTULO_FORMA_PAGAMENTO] ?? f}: ${formatarMoeda(v.informado)}`)
                        .join(" · ")}
                    </TableCell>
                    <TableCell className={cn("pr-5 text-right font-medium", (c.diferenca_centavos ?? 0) < 0 ? "text-destructive" : (c.diferenca_centavos ?? 0) > 0 ? "text-success" : "")}>
                      {formatarMoeda(c.diferenca_centavos ?? 0)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!anteriores?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                    Nenhum caixa fechado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
