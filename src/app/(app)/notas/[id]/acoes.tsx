"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileCodeIcon, FileDownIcon, FilePenLineIcon, Loader2Icon, MessageCircleIcon, RefreshCwIcon, SendIcon, XCircleIcon } from "lucide-react";

import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { linkWhatsApp } from "@/lib/dominio/contato";
import type { StatusNota, TipoNota } from "@/lib/supabase/tipos";
import { atualizarStatusNota, cancelar, cartaCorrecao, reenviar } from "../actions";

/** Enquanto a nota está em processamento, consulta a API a cada poucos segundos */
export function AtualizacaoAutomatica({ id }: { id: string }) {
  const router = useRouter();
  const tentativas = useRef(0);
  useEffect(() => {
    let ativo = true;
    async function consultar() {
      if (!ativo) return;
      tentativas.current++;
      const r = await atualizarStatusNota(id);
      if (!ativo) return;
      if (r.ok && r.dados.status !== "processando") {
        router.refresh();
        return;
      }
      setTimeout(consultar, Math.min(15000, 2000 * tentativas.current));
    }
    const t = setTimeout(consultar, 1500);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [id, router]);
  return null;
}

function DialogoTexto({
  titulo,
  descricao,
  rotuloBotao,
  destrutivo,
  aberto,
  fechar,
  aoConfirmar,
  pendente,
}: {
  titulo: string;
  descricao: string;
  rotuloBotao: string;
  destrutivo?: boolean;
  aberto: boolean;
  fechar: () => void;
  aoConfirmar: (texto: string) => void;
  pendente: boolean;
}) {
  const [texto, setTexto] = useState("");
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <Textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} />
        <p className="text-xs text-muted-foreground">{texto.trim().length}/15 caracteres mínimos</p>
        <DialogFooter>
          <Button variant={destrutivo ? "destructive" : "default"} disabled={texto.trim().length < 15 || pendente} onClick={() => aoConfirmar(texto)}>
            {pendente && <Loader2Icon className="animate-spin" />} {rotuloBotao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AcoesNota({
  id,
  tipo,
  status,
  podeCancelar,
  prazoCancelamento,
  link,
  whatsapp,
  mensagem,
}: {
  id: string;
  tipo: TipoNota;
  status: StatusNota;
  podeCancelar: boolean;
  prazoCancelamento: number | null;
  link: string;
  whatsapp: string | null;
  mensagem: string;
}) {
  const acao = useAcao();
  const router = useRouter();
  const [cancelando, setCancelando] = useState(false);
  const [corrigindo, setCorrigindo] = useState(false);
  const autorizada = status === "autorizada";

  return (
    <div className="grid h-fit gap-4 lg:sticky lg:top-6">
      <Card>
        <CardHeader>
          <CardTitle>Ações</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {(status === "rejeitada" || status === "erro") && (
            <Button size="lg" onClick={() => acao.executar(() => reenviar(id), { aoConcluir: () => router.refresh() })} disabled={acao.pendente}>
              {acao.pendente ? <Loader2Icon className="animate-spin" /> : <SendIcon />} Reenviar nota
            </Button>
          )}
          {status === "processando" && (
            <Button variant="outline" onClick={() => acao.executar(() => atualizarStatusNota(id), { silencioso: true, aoConcluir: () => router.refresh() })} disabled={acao.pendente}>
              <RefreshCwIcon className={acao.pendente ? "animate-spin" : ""} /> Consultar agora
            </Button>
          )}
          {(autorizada || status === "cancelada") && (
            <>
              <Button variant="outline" asChild>
                <a href={`/api/notas/${id}/arquivo?tipo=pdf`} target="_blank" rel="noreferrer">
                  <FileDownIcon /> Baixar PDF ({tipo === "nfse" ? "DANFSE" : "DANFE"})
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/api/notas/${id}/arquivo?tipo=xml`} download>
                  <FileCodeIcon /> Baixar XML
                </a>
              </Button>
            </>
          )}
          {autorizada && (
            <Button variant="outline" asChild>
              <a href={linkWhatsApp(whatsapp, mensagem)} target="_blank" rel="noreferrer">
                <MessageCircleIcon /> Enviar ao cliente no WhatsApp
              </a>
            </Button>
          )}
          {autorizada && tipo === "nfe" && (
            <Button variant="outline" onClick={() => setCorrigindo(true)}>
              <FilePenLineIcon /> Carta de correção
            </Button>
          )}
          {podeCancelar && (
            <Button variant="ghost" className="text-destructive" onClick={() => setCancelando(true)}>
              <XCircleIcon /> Cancelar nota
            </Button>
          )}
          {autorizada && !podeCancelar && prazoCancelamento !== null && (
            <p className="text-xs text-muted-foreground">
              Prazo de cancelamento ({prazoCancelamento < 1 ? `${prazoCancelamento * 60} minutos` : `${prazoCancelamento} horas`}) encerrado ou sem permissão.
            </p>
          )}
        </CardContent>
      </Card>
      {autorizada && (
        <Card>
          <CardHeader>
            <CardTitle>Link para o cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <a href={link} target="_blank" rel="noreferrer" className="text-xs break-all text-primary underline">
              {link}
            </a>
          </CardContent>
        </Card>
      )}
      <DialogoTexto
        titulo="Cancelar nota"
        descricao="Informe a justificativa (mínimo de 15 caracteres). O cancelamento é enviado à SEFAZ/prefeitura."
        rotuloBotao="Cancelar nota"
        destrutivo
        aberto={cancelando}
        fechar={() => setCancelando(false)}
        pendente={acao.pendente}
        aoConfirmar={(texto) => acao.executar(() => cancelar({ id, texto }), { aoConcluir: () => setCancelando(false) })}
      />
      <DialogoTexto
        titulo="Carta de correção (CC-e)"
        descricao="Corrige dados que não alteram valores, impostos, datas ou destinatário. Ex.: endereço, transportadora, descrição complementar."
        rotuloBotao="Registrar correção"
        aberto={corrigindo}
        fechar={() => setCorrigindo(false)}
        pendente={acao.pendente}
        aoConfirmar={(texto) => acao.executar(() => cartaCorrecao({ id, texto }), { aoConcluir: () => setCorrigindo(false) })}
      />
    </div>
  );
}
