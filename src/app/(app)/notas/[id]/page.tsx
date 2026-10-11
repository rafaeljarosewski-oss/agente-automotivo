import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangleIcon } from "lucide-react";

import { Cabecalho } from "@/components/comum/cabecalho";
import { StatusNota } from "@/components/comum/status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { env } from "@/lib/env";
import { formatarDataHora } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { mensagemNota } from "@/lib/dominio/mensagens";
import { ROTULO_TIPO_NOTA } from "@/lib/dominio/rotulos";
import { PRAZO_CANCELAMENTO_HORAS } from "@/lib/fiscal/servico";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { AcoesNota, AtualizacaoAutomatica } from "./acoes";

export default async function PaginaNota({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao("admin", "atendente");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: nota } = await supabase
    .from("notas_fiscais")
    .select("*, clientes(id, nome, whatsapp, telefone), ordens_servico(id, numero), nota_itens(*), notas_eventos(*)")
    .eq("id", id)
    .maybeSingle();
  if (!nota) notFound();
  const itens = [...nota.nota_itens].sort((a, b) => a.numero_item - b.numero_item);
  const eventos = [...nota.notas_eventos].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const titulo = `${ROTULO_TIPO_NOTA[nota.tipo]}${nota.numero ? ` nº ${nota.numero}` : ""}`;
  const link = `${env.appUrl}/p/n/${nota.token_publico}`;
  const prazo = PRAZO_CANCELAMENTO_HORAS[nota.tipo];
  const emitidaEm = new Date(nota.data_emissao ?? nota.created_at).getTime();
  // eslint-disable-next-line react-hooks/purity -- página dinâmica renderizada a cada requisição
  const dentroDoPrazo = prazo === null || Date.now() - emitidaEm <= prazo * 3600_000;

  return (
    <>
      {nota.status === "processando" && <AtualizacaoAutomatica id={nota.id} />}
      <Cabecalho
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            {titulo} <StatusNota status={nota.status} />
            {nota.ambiente === "homologacao" && <Badge variant="muted">homologação — sem valor fiscal</Badge>}
          </span>
        }
        descricao={
          <>
            {nota.data_emissao ? `Emitida em ${formatarDataHora(nota.data_emissao)}` : `Criada em ${formatarDataHora(nota.created_at)}`}
            {nota.ordens_servico && (
              <>
                {" "}
                · <Link href={`/os/${nota.ordens_servico.id}`} className="underline">OS nº {nota.ordens_servico.numero}</Link>
              </>
            )}
            {nota.nfse_provedor && ` · ${nota.nfse_provedor === "nacional" ? "Sistema Nacional NFS-e" : "provedor da prefeitura"}`}
          </>
        }
        voltar={{ href: "/notas", rotulo: "Notas fiscais" }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-6">
          {(nota.status === "rejeitada" || nota.status === "erro") && (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>{nota.status === "rejeitada" ? "Nota rejeitada" : "Nota não enviada"}</AlertTitle>
              <AlertDescription>
                <p>{nota.motivo_amigavel}</p>
                {nota.motivo_rejeicao && nota.motivo_rejeicao !== nota.motivo_amigavel && (
                  <p className="text-xs opacity-80">
                    Mensagem original{nota.codigo_rejeicao ? ` (código ${nota.codigo_rejeicao})` : ""}: {nota.motivo_rejeicao}
                  </p>
                )}
                <p className="text-xs">
                  Corrija no cadastro{nota.clientes && (
                    <>
                      {" "}
                      do <Link className="underline" href={`/clientes/${nota.clientes.id}`}>cliente</Link>
                    </>
                  )}
                  , do <Link className="underline" href="/catalogo">catálogo</Link> ou nas <Link className="underline" href="/configuracoes/fiscal">configurações fiscais</Link> e clique em &quot;Reenviar nota&quot;.
                </p>
              </AlertDescription>
            </Alert>
          )}
          {nota.status === "processando" && (
            <Alert variant="warning">
              <AlertTitle>Em processamento</AlertTitle>
              <AlertDescription>A SEFAZ/prefeitura ainda está analisando. Esta tela atualiza sozinha.</AlertDescription>
            </Alert>
          )}
          <Card>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Cliente</p>
                <p className="font-medium">{nota.clientes?.nome ?? "Consumidor não identificado"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Valor</p>
                <p className="font-medium">{formatarMoeda(nota.valor_total_centavos)}</p>
                {(nota.valor_ibs_centavos > 0 || nota.valor_cbs_centavos > 0) && (
                  <p className="text-xs text-muted-foreground">
                    IBS {formatarMoeda(nota.valor_ibs_centavos)} · CBS {formatarMoeda(nota.valor_cbs_centavos)} (informativos)
                  </p>
                )}
              </div>
              {nota.chave && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Chave de acesso</p>
                  <p className="font-mono text-xs break-all">{nota.chave.replace(/(\d{4})/g, "$1 ").trim()}</p>
                </div>
              )}
              {nota.protocolo && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Protocolo</p>
                  <p className="font-mono text-xs">{nota.protocolo}</p>
                </div>
              )}
              {nota.codigo_verificacao && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Código de verificação</p>
                  <p className="font-mono text-xs">{nota.codigo_verificacao}</p>
                </div>
              )}
              {nota.status === "cancelada" && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Cancelada</p>
                  <p>
                    {formatarDataHora(nota.cancelada_em)} — {nota.motivo_cancelamento}
                  </p>
                </div>
              )}
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
                    <TableHead className="hidden sm:table-cell">{nota.tipo === "nfse" ? "Cód. serviço" : "NCM / CFOP"}</TableHead>
                    <TableHead className="pr-5 text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="pl-5 whitespace-normal">
                        {i.descricao}
                        <span className="block text-xs text-muted-foreground">
                          {Number(i.quantidade).toLocaleString("pt-BR")} {i.unidade} × {formatarMoeda(i.valor_unitario_centavos)}
                          {i.desconto_centavos ? ` − desconto ${formatarMoeda(i.desconto_centavos)}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs sm:table-cell">{nota.tipo === "nfse" ? i.codigo_servico : `${i.ncm ?? "—"} / ${i.cfop ?? "—"}`}</TableCell>
                      <TableCell className="pr-5 text-right">{formatarMoeda(i.valor_total_centavos)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {eventos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Eventos</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {eventos.map((e) => (
                  <div key={e.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>{e.tipo === "cancelamento" ? "Cancelamento" : `Carta de correção nº ${e.sequencia}`}</strong>
                      <Badge variant={e.status === "registrado" ? "success" : e.status === "pendente" ? "warning" : "danger"}>{e.status}</Badge>
                    </div>
                    <p className="text-muted-foreground">{e.texto}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarDataHora(e.created_at)}
                      {e.protocolo ? ` · protocolo ${e.protocolo}` : ""}
                      {e.mensagem ? ` · ${e.mensagem}` : ""}
                    </p>
                    {e.pdf_path && (
                      <a className="text-xs underline" href={`/api/notas/${nota.id}/arquivo?tipo=evento&evento=${e.id}`} target="_blank" rel="noreferrer">
                        Baixar PDF do evento
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <AcoesNota
          id={nota.id}
          tipo={nota.tipo}
          status={nota.status}
          podeCancelar={sessao.perfil.papel === "admin" && nota.status === "autorizada" && dentroDoPrazo}
          prazoCancelamento={prazo}
          link={link}
          whatsapp={nota.clientes?.whatsapp ?? nota.clientes?.telefone ?? null}
          mensagem={mensagemNota({
            cliente: nota.clientes?.nome ?? "cliente",
            tipo: ROTULO_TIPO_NOTA[nota.tipo],
            numero: nota.numero,
            empresa: sessao.empresa.nome_fantasia ?? sessao.empresa.razao_social,
            link,
          })}
        />
      </div>
    </>
  );
}
