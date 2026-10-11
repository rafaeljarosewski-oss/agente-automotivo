import Link from "next/link";
import { notFound } from "next/navigation";
import { FilePlus2Icon } from "lucide-react";

import { Cabecalho } from "@/components/comum/cabecalho";
import { StatusOS } from "@/components/comum/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarData } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { formatarPlaca } from "@/lib/dominio/placa";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export default async function PaginaVeiculo({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: veiculo } = await supabase
    .from("veiculos")
    .select("*, clientes(id, nome), categorias_veiculo(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!veiculo) notFound();

  const { data: ordens } = await supabase
    .from("ordens_servico")
    .select("id, numero, status, total_centavos, created_at, concluida_em, km, os_itens(id, descricao, quantidade, unidade, total_centavos, tipo, numeros_serie)")
    .eq("veiculo_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const instalador = sessao.perfil.papel === "instalador";
  return (
    <>
      <Cabecalho
        titulo={
          <>
            <span className="font-mono">{formatarPlaca(veiculo.placa)}</span> · {[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")}
          </>
        }
        descricao={[veiculo.categorias_veiculo?.nome, veiculo.ano_modelo && `ano ${veiculo.ano_fabricacao ?? "?"}/${veiculo.ano_modelo}`, veiculo.cor, veiculo.chassi && `chassi ${veiculo.chassi}`]
          .filter(Boolean)
          .join(" · ")}
        voltar={instalador ? { href: "/os", rotulo: "Minhas OS" } : { href: `/clientes/${veiculo.clientes?.id}`, rotulo: veiculo.clientes?.nome ?? "Cliente" }}
      >
        {!instalador && (
          <Button asChild>
            <Link href={`/orcamentos/novo?cliente=${veiculo.cliente_id}&veiculo=${veiculo.id}`}>
              <FilePlus2Icon /> Novo orçamento
            </Link>
          </Button>
        )}
      </Cabecalho>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de serviços</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          {!ordens?.length && <p className="text-sm text-muted-foreground">Nenhuma OS para este veículo.</p>}
          {ordens?.map((o) => (
            <div key={o.id} className="rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
                <Link href={`/os/${o.id}`} className="font-medium hover:underline">
                  OS nº {o.numero} · {formatarData(o.concluida_em ?? o.created_at)}
                  {o.km ? ` · ${o.km.toLocaleString("pt-BR")} km` : ""}
                </Link>
                <span className="flex items-center gap-2">
                  {!instalador && formatarMoeda(o.total_centavos)} <StatusOS status={o.status} />
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    {!instalador && <TableHead className="text-right">Valor</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {o.os_itens.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        {i.descricao}
                        {i.numeros_serie.length > 0 && <span className="ml-1 text-xs text-muted-foreground">(série {i.numeros_serie.join(", ")})</span>}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {Number(i.quantidade).toLocaleString("pt-BR")} {i.unidade}
                      </TableCell>
                      {!instalador && <TableCell className="text-right">{formatarMoeda(i.total_centavos)}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
