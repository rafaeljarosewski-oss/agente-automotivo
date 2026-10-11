"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { CheckCircle2Icon, FileDownIcon, Loader2Icon, MessageCircleIcon, PackageCheckIcon, PauseCircleIcon, PencilIcon, PlayCircleIcon, RotateCcwIcon, Trash2Icon, XCircleIcon } from "lucide-react";

import { Confirmar } from "@/components/comum/confirmar";
import { useAcao } from "@/components/formulario/usar-acao";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { linkWhatsApp } from "@/lib/dominio/contato";
import { formatarData } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { mensagemOS } from "@/lib/dominio/mensagens";
import { ROTULO_FORMA_PAGAMENTO, ROTULO_STATUS_OS } from "@/lib/dominio/rotulos";
import type { ComissaoGerada, Parcela } from "@/lib/dominio/calculos";
import type { FormaPagamento, PapelUsuario, StatusOS } from "@/lib/supabase/tipos";
import { alterarStatus, concluirOS, excluirOS, previaConclusao } from "../actions";

interface ItemSerie {
  id: string;
  descricao: string;
  quantidade: number;
  numeros_serie: string[];
}

function DialogoConclusao({
  id,
  formaInicial,
  parcelasIniciais,
  total,
  itensSerie,
  mostrarValores,
  fechar,
}: {
  id: string;
  formaInicial: FormaPagamento | null;
  parcelasIniciais: number;
  total: number;
  itensSerie: ItemSerie[];
  mostrarValores: boolean;
  fechar: () => void;
}) {
  const [forma, setForma] = useState<FormaPagamento | "">(formaInicial ?? "");
  const [parcelas, setParcelas] = useState(parcelasIniciais);
  const [series, setSeries] = useState<Record<string, string>>(Object.fromEntries(itensSerie.map((i) => [i.id, i.numeros_serie.join(", ")])));
  const [previa, setPrevia] = useState<{ parcelas: Parcela[]; comissoes: ComissaoGerada[] } | null>(null);
  const [calculando, iniciar] = useTransition();
  const { pendente, erro, executar } = useAcao();
  const parcelavel = forma === "credito_parcelado" || forma === "boleto";

  useEffect(() => {
    iniciar(async () => {
      const r = await previaConclusao({ id, forma_pagamento: forma || null, parcelas: parcelavel ? parcelas : 1 });
      if (r.ok) setPrevia(r.dados);
    });
  }, [id, forma, parcelas, parcelavel]);

  const seriesValidas = itensSerie.every((i) => series[i.id]?.split(",").map((s) => s.trim()).filter(Boolean).length === i.quantidade);

  return (
    <Dialog open onOpenChange={(a) => !a && fechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Concluir OS</DialogTitle>
          <DialogDescription>Ao concluir, o estoque é baixado (película pela tabela de consumo) e as contas a receber são geradas.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {itensSerie.length > 0 && (
            <div className="grid gap-3">
              <p className="text-sm font-medium">Números de série</p>
              {itensSerie.map((i) => (
                <div key={i.id} className="grid gap-1">
                  <Label htmlFor={`serie-${i.id}`} className="text-xs">
                    {i.descricao} ({i.quantidade} un.)
                  </Label>
                  <Input id={`serie-${i.id}`} value={series[i.id] ?? ""} onChange={(e) => setSeries({ ...series, [i.id]: e.target.value })} placeholder="Separe por vírgula" />
                </div>
              ))}
            </div>
          )}
          {mostrarValores && (
            <>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="grid gap-1">
                  <Label htmlFor="forma-conclusao">Forma de pagamento</Label>
                  <NativeSelect id="forma-conclusao" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento | "")}>
                    <option value="">Definir no recebimento</option>
                    {Object.entries(ROTULO_FORMA_PAGAMENTO).map(([v, r]) => (
                      <option key={v} value={v}>
                        {r}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                {parcelavel && (
                  <div className="grid gap-1">
                    <Label htmlFor="parcelas-conclusao">Parcelas</Label>
                    <NativeSelect id="parcelas-conclusao" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}x
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}
              </div>
              <div className="rounded-md border p-3 text-sm">
                <div className="mb-2 flex justify-between font-medium">
                  <span>Contas a receber</span>
                  <span>{formatarMoeda(total)}</span>
                </div>
                {calculando && !previa ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <ul className="grid gap-1 text-muted-foreground">
                    {previa?.parcelas.map((p) => (
                      <li key={p.parcela} className="flex justify-between">
                        <span>
                          {previa.parcelas.length > 1 ? `${p.parcela}/${previa.parcelas.length} · ` : ""}vence {formatarData(p.vencimento)}
                        </span>
                        <span>{formatarMoeda(p.valor_centavos)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {previa && previa.comissoes.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Comissões geradas: {formatarMoeda(previa.comissoes.reduce((s, c) => s + c.valor_centavos, 0))}
                  </p>
                )}
              </div>
            </>
          )}
          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="success"
            disabled={pendente || !seriesValidas}
            onClick={() =>
              executar(
                () =>
                  concluirOS({
                    id,
                    forma_pagamento: forma || null,
                    parcelas: parcelavel ? parcelas : 1,
                    series: Object.fromEntries(itensSerie.map((i) => [i.id, (series[i.id] ?? "").split(",").map((s) => s.trim()).filter(Boolean)])),
                  }),
                { aoConcluir: fechar },
              )
            }
          >
            {pendente ? <Loader2Icon className="animate-spin" /> : <CheckCircle2Icon />} Concluir OS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AcoesOS({
  id,
  numero,
  status,
  papel,
  formaPagamento,
  parcelas,
  total,
  itensSerie,
  cliente,
  empresa,
}: {
  id: string;
  numero: number;
  status: StatusOS;
  papel: PapelUsuario;
  formaPagamento: FormaPagamento | null;
  parcelas: number;
  total: number;
  itensSerie: ItemSerie[];
  cliente: { nome: string; whatsapp: string | null };
  empresa: string;
}) {
  const acao = useAcao();
  const [concluindo, setConcluindo] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const instalador = papel === "instalador";
  const emAndamento = ["aberta", "em_execucao", "aguardando_peca"].includes(status);
  const mudar = (novo: StatusOS, observacao?: string) => acao.executar(() => alterarStatus({ id, status: novo as never, observacao }));

  return (
    <div className="grid h-fit gap-4 lg:sticky lg:top-6">
      <Card>
        <CardHeader>
          <CardTitle>Ações</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {status === "aberta" && (
            <Button size="lg" onClick={() => mudar("em_execucao")} disabled={acao.pendente}>
              <PlayCircleIcon /> Iniciar serviço
            </Button>
          )}
          {status === "aguardando_peca" && (
            <Button size="lg" onClick={() => mudar("em_execucao")} disabled={acao.pendente}>
              <PlayCircleIcon /> Retomar serviço
            </Button>
          )}
          {emAndamento && (
            <Button size="lg" variant="success" onClick={() => setConcluindo(true)}>
              <CheckCircle2Icon /> Concluir OS
            </Button>
          )}
          {status === "em_execucao" && (
            <Button variant="outline" onClick={() => mudar("aguardando_peca")} disabled={acao.pendente}>
              <PauseCircleIcon /> Aguardando peça
            </Button>
          )}
          {status === "em_execucao" && (
            <Button variant="outline" onClick={() => mudar("aberta")} disabled={acao.pendente}>
              <RotateCcwIcon /> Voltar para aberta
            </Button>
          )}
          {status === "concluida" && (
            <Button size="lg" onClick={() => mudar("entregue")} disabled={acao.pendente}>
              <PackageCheckIcon /> Marcar como entregue
            </Button>
          )}
          <Button variant="outline" asChild>
            <a href={`/api/pdf/os/${id}`} target="_blank" rel="noreferrer">
              <FileDownIcon /> Imprimir OS (PDF)
            </a>
          </Button>
          {!instalador && cliente.whatsapp && (
            <Button variant="outline" asChild>
              <a
                href={linkWhatsApp(cliente.whatsapp, mensagemOS({ cliente: cliente.nome, numero, empresa, status: ROTULO_STATUS_OS[status] }))}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircleIcon /> Avisar cliente
              </a>
            </Button>
          )}
          {!instalador && emAndamento && (
            <Button variant="outline" asChild>
              <Link href={`/os/${id}/editar`}>
                <PencilIcon /> Editar OS
              </Link>
            </Button>
          )}
          {!instalador && emAndamento && (
            <Button variant="ghost" className="text-destructive" onClick={() => setCancelando(true)}>
              <XCircleIcon /> Cancelar OS
            </Button>
          )}
          {!instalador && (status === "aberta" || status === "cancelada") && (
            <Confirmar titulo="Excluir esta OS?" destrutivo textoConfirmar="Excluir" aoConfirmar={() => acao.executar(() => excluirOS(id))}>
              <Button variant="ghost" className="text-destructive">
                <Trash2Icon /> Excluir
              </Button>
            </Confirmar>
          )}
        </CardContent>
      </Card>

      {concluindo && (
        <DialogoConclusao
          id={id}
          formaInicial={formaPagamento}
          parcelasIniciais={parcelas}
          total={total}
          itensSerie={itensSerie}
          mostrarValores={!instalador}
          fechar={() => setConcluindo(false)}
        />
      )}

      <Dialog open={cancelando} onOpenChange={setCancelando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar OS nº {numero}</DialogTitle>
            <DialogDescription>Informe o motivo. Nada é baixado do estoque.</DialogDescription>
          </DialogHeader>
          <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: cliente desistiu" />
          <DialogFooter>
            <Button variant="destructive" disabled={!motivo.trim() || acao.pendente} onClick={() => acao.executar(() => alterarStatus({ id, status: "cancelada", observacao: motivo }), { aoConcluir: () => setCancelando(false) })}>
              Cancelar OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
