import Link from "next/link";
import { notFound } from "next/navigation";

import { Cabecalho } from "@/components/comum/cabecalho";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarDataHora } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_TIPO_MOVIMENTO } from "@/lib/dominio/rotulos";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { FormulariosEstoque } from "./formularios";

const qtd = (n: number | null) => Number(n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export default async function PaginaProdutoEstoque({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao("admin", "atendente");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: produto } = await supabase.from("produtos").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!produto) notFound();
  const [{ data: movimentos }, { data: rolos }, { data: series }, { data: perfis }] = await Promise.all([
    supabase.from("movimentacoes_estoque").select("*, ordens_servico(id, numero)").eq("produto_id", id).order("created_at", { ascending: false }).limit(300),
    supabase.from("rolos_pelicula").select("*").eq("produto_id", id).order("created_at"),
    produto.exige_numero_serie ? supabase.from("numeros_serie").select("*").eq("produto_id", id).order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [] }),
    supabase.from("perfis").select("id, nome"),
  ]);
  const nome = (pid: string | null) => perfis?.find((p) => p.id === pid)?.nome ?? "—";
  const baixo = produto.estoque_minimo > 0 && produto.estoque_atual <= produto.estoque_minimo;

  return (
    <>
      <Cabecalho
        titulo={produto.nome}
        descricao={
          <>
            Saldo:{" "}
            <strong className={cn(baixo && "text-destructive")}>
              {qtd(produto.estoque_atual)} {produto.unidade}
            </strong>{" "}
            · mínimo {qtd(produto.estoque_minimo)} {produto.unidade} ·{" "}
            <Link href={`/catalogo/produtos/${produto.id}`} className="underline">
              cadastro do produto
            </Link>
          </>
        }
        voltar={{ href: "/estoque", rotulo: "Estoque" }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          {produto.tipo_controle === "metro" && (
            <Card>
              <CardHeader>
                <CardTitle>Rolos</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {rolos?.length ? (
                  rolos.map((r) => {
                    const pct = Math.max(0, Math.min(100, (Number(r.saldo_metros) / Number(r.metragem_inicial)) * 100));
                    return (
                      <div key={r.id} className={cn("rounded-md border p-3", !r.ativo && "opacity-60")}>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{r.identificacao ?? "Rolo"}</span>
                          <span>
                            {qtd(r.saldo_metros)} / {qtd(r.metragem_inicial)} m
                          </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded bg-muted">
                          <div className={cn("h-full", pct < 20 ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Entrada em {formatarDataHora(r.created_at)}{!r.ativo && " · esgotado"}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum rolo cadastrado. Lance uma entrada para abrir um rolo.</p>
                )}
              </CardContent>
            </Card>
          )}
          <Card className="py-0">
            <CardHeader className="pt-5">
              <CardTitle>Histórico de movimentação</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="hidden md:table-cell">Motivo</TableHead>
                    <TableHead className="hidden pr-5 lg:table-cell">Usuário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentos?.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="pl-5 whitespace-nowrap">{formatarDataHora(m.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={m.tipo === "entrada" ? "success" : m.tipo === "saida" ? "info" : "warning"}>{ROTULO_TIPO_MOVIMENTO[m.tipo]}</Badge>
                      </TableCell>
                      <TableCell className={cn("text-right font-medium", Number(m.quantidade) < 0 ? "text-destructive" : "text-success")}>
                        {Number(m.quantidade) > 0 ? "+" : ""}
                        {qtd(m.quantidade)}
                      </TableCell>
                      <TableCell className="text-right">{qtd(m.saldo_apos)}</TableCell>
                      <TableCell className="hidden whitespace-normal md:table-cell">
                        {m.ordens_servico ? (
                          <Link href={`/os/${m.ordens_servico.id}`} className="underline">
                            {m.motivo}
                          </Link>
                        ) : (
                          m.motivo
                        )}
                        {m.custo_unitario_centavos ? <span className="text-xs text-muted-foreground"> · custo {formatarMoeda(m.custo_unitario_centavos)}</span> : null}
                      </TableCell>
                      <TableCell className="hidden pr-5 lg:table-cell">{nome(m.created_by)}</TableCell>
                    </TableRow>
                  ))}
                  {!movimentos?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                        Nenhuma movimentação.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {produto.exige_numero_serie && (
            <Card>
              <CardHeader>
                <CardTitle>Números de série</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {series?.map((s) => (
                  <Badge key={s.id} variant={s.status === "disponivel" ? "success" : s.status === "vendido" ? "muted" : "danger"} className="font-mono">
                    {s.numero} · {s.status}
                  </Badge>
                ))}
                {!series?.length && <p className="text-sm text-muted-foreground">Nenhuma série registrada.</p>}
              </CardContent>
            </Card>
          )}
        </div>
        {sessao.perfil.papel === "admin" ? (
          <FormulariosEstoque
            produto={{ id: produto.id, unidade: produto.unidade, tipo_controle: produto.tipo_controle, exige_numero_serie: produto.exige_numero_serie, custo_centavos: produto.custo_centavos }}
            rolos={(rolos ?? []).filter((r) => r.ativo).map((r) => ({ id: r.id, identificacao: r.identificacao, saldo: Number(r.saldo_metros) }))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Entradas e ajustes são feitos pelo administrador.</p>
        )}
      </div>
    </>
  );
}
