import Link from "next/link";
import { notFound } from "next/navigation";

import { Cabecalho } from "@/components/comum/cabecalho";
import { StatusOrcamento } from "@/components/comum/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { env } from "@/lib/env";
import { formatarTelefone } from "@/lib/dominio/contato";
import { formatarData, formatarDataHora } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { mensagemOrcamento } from "@/lib/dominio/mensagens";
import { formatarPlaca } from "@/lib/dominio/placa";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { AcoesOrcamento } from "./acoes";

export default async function PaginaOrcamento({ params }: { params: Promise<{ id: string }> }) {
  const { empresa } = await exigirSessao("admin", "atendente");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: orc } = await supabase
    .from("orcamentos")
    .select("*, clientes(id, nome, whatsapp, telefone, email), veiculos(id, placa, marca, modelo, categorias_veiculo(nome)), orcamento_itens(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!orc) notFound();
  const [{ data: os }, { data: instaladores }] = await Promise.all([
    supabase.from("ordens_servico").select("id, numero").eq("orcamento_id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("perfis").select("id, nome").eq("papel", "instalador").eq("ativo", true).order("nome"),
  ]);

  const itens = [...orc.orcamento_itens].sort((a, b) => a.ordem - b.ordem);
  const link = `${env.appUrl}/p/o/${orc.token_publico}`;
  const veiculo = orc.veiculos ? `${[orc.veiculos.marca, orc.veiculos.modelo].filter(Boolean).join(" ")} (${formatarPlaca(orc.veiculos.placa)})` : null;
  const mensagem = mensagemOrcamento({
    cliente: orc.clientes?.nome ?? "",
    numero: orc.numero,
    empresa: empresa.nome_fantasia ?? empresa.razao_social,
    total: orc.total_centavos,
    validade: orc.validade,
    link,
    veiculo,
  });

  return (
    <>
      <Cabecalho
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            Orçamento nº {orc.numero} <StatusOrcamento status={orc.status} />
          </span>
        }
        descricao={`Criado em ${formatarDataHora(orc.created_at)} · válido até ${formatarData(orc.validade)}`}
        voltar={{ href: "/orcamentos", rotulo: "Orçamentos" }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-6">
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Cliente</p>
                <Link href={`/clientes/${orc.clientes?.id}`} className="font-medium hover:underline">
                  {orc.clientes?.nome}
                </Link>
                <p className="text-sm text-muted-foreground">{formatarTelefone(orc.clientes?.whatsapp ?? orc.clientes?.telefone)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Veículo</p>
                {orc.veiculos ? (
                  <Link href={`/veiculos/${orc.veiculos.id}`} className="font-medium hover:underline">
                    <span className="font-mono">{formatarPlaca(orc.veiculos.placa)}</span> · {[orc.veiculos.marca, orc.veiculos.modelo].filter(Boolean).join(" ")}
                  </Link>
                ) : (
                  <p className="text-sm">—</p>
                )}
                {orc.veiculos?.categorias_veiculo && <p className="text-sm text-muted-foreground">{orc.veiculos.categorias_veiculo.nome}</p>}
              </div>
            </CardContent>
          </Card>
          <Card className="py-0">
            <CardHeader className="pt-5">
              <CardTitle>Itens</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Descrição</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Unitário</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Desconto</TableHead>
                    <TableHead className="pr-5 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="pl-5 whitespace-normal">
                        {i.descricao}
                        {Array.isArray(i.medidas) && i.medidas.length > 0 && (
                          <span className="block text-xs text-muted-foreground">{i.medidas.length} vidro(s) · {Number(i.area_m2).toLocaleString("pt-BR")} m²</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {Number(i.quantidade).toLocaleString("pt-BR")} {i.unidade}
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">{formatarMoeda(i.preco_unitario_centavos)}</TableCell>
                      <TableCell className="hidden text-right sm:table-cell">{i.desconto_centavos ? formatarMoeda(i.desconto_centavos) : "—"}</TableCell>
                      <TableCell className="pr-5 text-right">{formatarMoeda(i.total_centavos)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="pl-5 text-right">
                      Subtotal{orc.desconto_itens_centavos + orc.desconto_total_centavos > 0 ? " / descontos" : ""}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {formatarMoeda(orc.subtotal_centavos)}
                      {orc.desconto_itens_centavos + orc.desconto_total_centavos > 0 && (
                        <span className="block text-xs text-muted-foreground">− {formatarMoeda(orc.desconto_itens_centavos + orc.desconto_total_centavos)}</span>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} className="pl-5 text-right text-base">
                      Total
                    </TableCell>
                    <TableCell className="pr-5 text-right text-base font-semibold">{formatarMoeda(orc.total_centavos)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
          {(orc.observacoes || orc.motivo_recusa) && (
            <Card>
              <CardContent className="grid gap-2 text-sm">
                {orc.observacoes && <p className="whitespace-pre-line">{orc.observacoes}</p>}
                {orc.motivo_recusa && <p className="text-destructive">Motivo da recusa: {orc.motivo_recusa}</p>}
              </CardContent>
            </Card>
          )}
        </div>
        <AcoesOrcamento
          id={orc.id}
          status={orc.status}
          link={link}
          whatsapp={orc.clientes?.whatsapp ?? orc.clientes?.telefone ?? null}
          mensagem={mensagem}
          os={os}
          instaladores={instaladores ?? []}
        />
      </div>
    </>
  );
}
