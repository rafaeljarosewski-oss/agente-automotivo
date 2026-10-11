"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon, CopyIcon, FileDownIcon, Loader2Icon, MessageCircleIcon, PencilIcon, ThumbsDownIcon, ThumbsUpIcon, Trash2Icon, WrenchIcon } from "lucide-react";
import { toast } from "sonner";

import { Confirmar } from "@/components/comum/confirmar";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { linkWhatsApp } from "@/lib/dominio/contato";
import type { StatusOrcamento } from "@/lib/supabase/tipos";
import { aprovarOrcamento, excluirOrcamento, gerarOS, marcarEnviado, recusarOrcamento } from "../actions";

export function AcoesOrcamento({
  id,
  status,
  link,
  whatsapp,
  mensagem,
  os,
  instaladores,
}: {
  id: string;
  status: StatusOrcamento;
  link: string;
  whatsapp: string | null;
  mensagem: string;
  os: { id: string; numero: number } | null;
  instaladores: { id: string; nome: string }[];
}) {
  const acao = useAcao();
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [gerando, setGerando] = useState(false);
  const [instalador, setInstalador] = useState("");
  const [copiado, setCopiado] = useState(false);
  const editavel = ["rascunho", "enviado", "expirado"].includes(status);

  return (
    <div className="grid h-fit gap-4 lg:sticky lg:top-6">
      <Card>
        <CardHeader>
          <CardTitle>Ações</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {os ? (
            <Button asChild variant="success">
              <Link href={`/os/${os.id}`}>
                <WrenchIcon /> Ver OS nº {os.numero}
              </Link>
            </Button>
          ) : (
            status !== "recusado" &&
            status !== "expirado" && (
              <Button variant="success" onClick={() => setGerando(true)}>
                <WrenchIcon /> Aprovar e gerar OS
              </Button>
            )
          )}
          <Button variant="outline" asChild>
            <a
              href={linkWhatsApp(whatsapp, mensagem)}
              target="_blank"
              rel="noreferrer"
              onClick={() => acao.executar(() => marcarEnviado(id), { silencioso: true })}
            >
              <MessageCircleIcon /> Enviar no WhatsApp
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/api/pdf/orcamento/${id}`} target="_blank" rel="noreferrer">
              <FileDownIcon /> Baixar PDF
            </a>
          </Button>
          {editavel && (
            <Button variant="outline" asChild>
              <Link href={`/orcamentos/${id}/editar`}>
                <PencilIcon /> Editar
              </Link>
            </Button>
          )}
          {(status === "rascunho" || status === "enviado") && !os && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => acao.executar(() => aprovarOrcamento(id))} disabled={acao.pendente}>
                <ThumbsUpIcon /> Aprovar
              </Button>
              <Button variant="outline" onClick={() => setRecusando(true)}>
                <ThumbsDownIcon /> Recusar
              </Button>
            </div>
          )}
          {status !== "aprovado" && (
            <Confirmar titulo="Excluir este orçamento?" destrutivo textoConfirmar="Excluir" aoConfirmar={() => acao.executar(() => excluirOrcamento(id))}>
              <Button variant="ghost" className="text-destructive">
                <Trash2Icon /> Excluir
              </Button>
            </Confirmar>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Link para o cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <p className="text-xs text-muted-foreground">O cliente vê o orçamento e baixa o PDF sem precisar de login.</p>
          <div className="flex gap-2">
            <Input readOnly value={link} className="text-xs" aria-label="Link público" onFocus={(e) => e.target.select()} />
            <Button
              variant="outline"
              size="icon"
              aria-label="Copiar link"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopiado(true);
                toast.success("Link copiado.");
                setTimeout(() => setCopiado(false), 2000);
              }}
            >
              {copiado ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={recusando} onOpenChange={setRecusando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar orçamento</DialogTitle>
            <DialogDescription>Registrar o motivo ajuda a entender por que os clientes não fecham.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Ex.: achou caro, vai pensar..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <DialogFooter>
            <Button variant="destructive" onClick={() => acao.executar(() => recusarOrcamento({ id, motivo }), { aoConcluir: () => setRecusando(false) })} disabled={acao.pendente}>
              Marcar como recusado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={gerando} onOpenChange={setGerando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar ordem de serviço</DialogTitle>
            <DialogDescription>O orçamento será aprovado e todos os itens irão para a OS.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="instalador-os">Instalador responsável</Label>
            <NativeSelect id="instalador-os" value={instalador} onChange={(e) => setInstalador(e.target.value)}>
              <option value="">Definir depois</option>
              {instaladores.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </NativeSelect>
          </div>
          <DialogFooter>
            <Button variant="success" onClick={() => acao.executar(() => gerarOS({ id, instalador_id: instalador || null }))} disabled={acao.pendente}>
              {acao.pendente ? <Loader2Icon className="animate-spin" /> : <WrenchIcon />} Gerar OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
