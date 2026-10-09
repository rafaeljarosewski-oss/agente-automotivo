import Link from "next/link";
import { notFound } from "next/navigation";
import { CarIcon, PhoneIcon } from "lucide-react";

import { Cabecalho } from "@/components/comum/cabecalho";
import { StatusOS } from "@/components/comum/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarTelefone } from "@/lib/dominio/contato";
import { formatarDataHora } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { formatarPlaca } from "@/lib/dominio/placa";
import { ROTULO_FORMA_PAGAMENTO, ROTULO_STATUS_OS } from "@/lib/dominio/rotulos";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { NotasDaOS } from "../../notas/notas-da-os";
import { AcoesOS } from "./acoes";

export default async function PaginaOS({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const { id } = await params;
  const instalador = sessao.perfil.papel === "instalador";
  const supabase = await criarClienteServidor();
  const { data: os } = await supabase
    .from("ordens_servico")
    .select("*, clientes(id, nome, whatsapp, telefone, tipo_pessoa), veiculos(id, placa, marca, modelo, cor, categorias_veiculo(nome)), os_itens(*, produtos(exige_numero_serie)), instalador:perfis!ordens_servico_instalador_id_fkey(id, nome), orcamentos(id, numero)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!os) notFound();
  const [{ data: historico }, { data: perfis }] = await Promise.all([
    supabase.from("os_historico").select("*").eq("os_id", id).order("created_at"),
    supabase.from("perfis").select("id, nome"),
  ]);
  const nome = (pid: string | null) => perfis?.find((p) => p.id === pid)?.nome ?? "—";
  const itens = [...os.os_itens].sort((a, b) => a.ordem - b.ordem);
  const itensSerie = itens
    .filter((i) => i.produtos?.exige_numero_serie)
    .map((i) => ({ id: i.id, descricao: i.descricao, quantidade: Number(i.quantidade), numeros_serie: i.numeros_serie }));

  return (
    <>
      <Cabecalho
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            OS nº {os.numero} <StatusOS status={os.status} />
          </span>
        }
        descricao={
          <>
            Aberta em {formatarDataHora(os.created_at)}
            {os.orcamentos && (
              <>
                {" "}
                · do{" "}
                <Link href={`/orcamentos/${os.orcamentos.id}`} className="underline">
                  orçamento nº {os.orcamentos.numero}
                </Link>
              </>
            )}
            {os.previsao_entrega && <> · entrega prevista {formatarDataHora(os.previsao_entrega)}</>}
          </>
        }
        voltar={{ href: "/os", rotulo: instalador ? "Minhas OS" : "Ordens de serviço" }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-6">
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Cliente</p>
                {instalador ? (
                  <p className="font-medium">{os.clientes?.nome}</p>
                ) : (
                  <Link href={`/clientes/${os.clientes?.id}`} className="font-medium hover:underline">
                    {os.clientes?.nome}
                  </Link>
                )}
                {(os.clientes?.whatsapp || os.clientes?.telefone) && (
                  <a href={`tel:${os.clientes?.whatsapp ?? os.clientes?.telefone}`} className="flex items-center gap-1 text-sm text-muted-foreground">
                    <PhoneIcon className="size-3" /> {formatarTelefone(os.clientes?.whatsapp ?? os.clientes?.telefone)}
                  </a>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Veículo</p>
                {os.veiculos ? (
                  <Link href={`/veiculos/${os.veiculos.id}`} className="flex items-center gap-1 font-medium hover:underline">
                    <CarIcon className="size-4" />
                    <span className="font-mono">{formatarPlaca(os.veiculos.placa)}</span>
                  </Link>
                ) : (
                  <p>—</p>
                )}
                {os.veiculos && (
                  <p className="text-sm text-muted-foreground">
                    {[os.veiculos.marca, os.veiculos.modelo, os.veiculos.cor, os.veiculos.categorias_veiculo?.nome].filter(Boolean).join(" · ")}
                    {os.km ? ` · ${os.km.toLocaleString("pt-BR")} km` : ""}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Instalador</p>
                <p className="font-medium">{os.instalador?.nome ?? "A definir"}</p>
                {!instalador && os.forma_pagamento && (
                  <p className="text-sm text-muted-foreground">
                    {ROTULO_FORMA_PAGAMENTO[os.forma_pagamento]}
                    {os.parcelas > 1 ? ` em ${os.parcelas}x` : ""}
                  </p>
                )}
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
                    {!instalador && <TableHead className="pr-5 text-right">Total</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="pl-5 whitespace-normal">
                        {i.descricao}
                        <span className="block text-xs text-muted-foreground">
                          {[
                            i.instalador_id ? `Instalador: ${nome(i.instalador_id)}` : null,
                            i.consumo_metros ? `consumo ${Number(i.consumo_metros).toLocaleString("pt-BR")} m de película` : null,
                            i.numeros_serie.length ? `série ${i.numeros_serie.join(", ")}` : null,
                            Array.isArray(i.medidas) && i.medidas.length ? `${i.medidas.length} vidro(s)` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {Number(i.quantidade).toLocaleString("pt-BR")} {i.unidade === "M2" ? "m²" : i.unidade}
                      </TableCell>
                      {!instalador && <TableCell className="pr-5 text-right">{formatarMoeda(i.total_centavos)}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
                {!instalador && (
                  <TableFooter>
                    {os.desconto_itens_centavos + os.desconto_total_centavos > 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="pl-5 text-right">
                          Descontos
                        </TableCell>
                        <TableCell className="pr-5 text-right">− {formatarMoeda(os.desconto_itens_centavos + os.desconto_total_centavos)}</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell colSpan={2} className="pl-5 text-right text-base">
                        Total
                      </TableCell>
                      <TableCell className="pr-5 text-right text-base font-semibold" data-testid="total-os">
                        {formatarMoeda(os.total_centavos)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </CardContent>
          </Card>

          {(os.observacoes || (!instalador && os.observacoes_internas) || os.motivo_cancelamento) && (
            <Card>
              <CardContent className="grid gap-2 text-sm">
                {os.observacoes && <p className="whitespace-pre-line">{os.observacoes}</p>}
                {!instalador && os.observacoes_internas && <p className="whitespace-pre-line text-muted-foreground">Interno: {os.observacoes_internas}</p>}
                {os.motivo_cancelamento && <p className="text-destructive">Motivo do cancelamento: {os.motivo_cancelamento}</p>}
              </CardContent>
            </Card>
          )}

          {!instalador && ["concluida", "entregue"].includes(os.status) && <NotasDaOS osId={os.id} empresa={sessao.empresa} />}

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-3 border-l pl-4 text-sm">
                {historico?.map((h) => (
                  <li key={h.id}>
                    <span className="font-medium">{ROTULO_STATUS_OS[h.status_novo]}</span>{" "}
                    <span className="text-muted-foreground">
                      · {formatarDataHora(h.created_at)} · {nome(h.created_by)}
                    </span>
                    {h.observacao && <p className="text-muted-foreground">{h.observacao}</p>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
        <AcoesOS
          id={os.id}
          numero={os.numero}
          status={os.status}
          papel={sessao.perfil.papel}
          formaPagamento={os.forma_pagamento}
          parcelas={os.parcelas}
          total={os.total_centavos}
          itensSerie={itensSerie}
          cliente={{ nome: os.clientes?.nome ?? "", whatsapp: os.clientes?.whatsapp ?? os.clientes?.telefone ?? null }}
          empresa={sessao.empresa.nome_fantasia ?? sessao.empresa.razao_social}
        />
      </div>
    </>
  );
}
