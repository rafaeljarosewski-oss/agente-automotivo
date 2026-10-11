"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, ReceiptIcon } from "lucide-react";

import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_TIPO_NOTA } from "@/lib/dominio/rotulos";
import type { NotaPlanejada } from "@/lib/fiscal/servico";
import { emitirNotas } from "./actions";

export function BotaoEmitirNotas({ osId, plano, clientePJ }: { osId: string; plano: NotaPlanejada[]; clientePJ: boolean }) {
  const [aberto, setAberto] = useState(false);
  const temProdutos = plano.some((p) => p.tipo !== "nfse");
  const [tipoProdutos, setTipoProdutos] = useState<"nfce" | "nfe">(clientePJ ? "nfe" : "nfce");
  const { pendente, executar } = useAcao();
  const router = useRouter();
  return (
    <>
      <Button size="sm" onClick={() => setAberto(true)}>
        <ReceiptIcon /> Emitir notas
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir notas fiscais</DialogTitle>
            <DialogDescription>Serviços vão em NFS-e; produtos em NFC-e (consumidor pessoa física) ou NF-e.</DialogDescription>
          </DialogHeader>
          <ul className="grid gap-2 text-sm">
            {plano.map((p, i) => (
              <li key={i} className="rounded-md border p-3">
                <div className="flex justify-between font-medium">
                  <span>{p.tipo === "nfse" ? p.descricao : temProdutos ? (tipoProdutos === "nfe" ? "NF-e — produtos" : "NFC-e — produtos") : p.descricao}</span>
                  <span>{formatarMoeda(p.total_centavos)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.itens.map((it) => it.descricao).join(" · ")}</p>
              </li>
            ))}
          </ul>
          {temProdutos && (
            <div className="grid gap-1.5">
              <Label htmlFor="tipo-produtos">Nota dos produtos</Label>
              <NativeSelect id="tipo-produtos" value={tipoProdutos} onChange={(e) => setTipoProdutos(e.target.value as "nfce" | "nfe")}>
                <option value="nfce">{ROTULO_TIPO_NOTA.nfce} — consumidor final</option>
                <option value="nfe">{ROTULO_TIPO_NOTA.nfe} — empresa ou quando o cliente pedir</option>
              </NativeSelect>
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={pendente}
              onClick={() =>
                executar(() => emitirNotas({ os_id: osId, tipo_produtos: temProdutos ? tipoProdutos : undefined }), {
                  aoConcluir: () => {
                    setAberto(false);
                    router.refresh();
                  },
                })
              }
            >
              {pendente ? <Loader2Icon className="animate-spin" /> : <ReceiptIcon />} Emitir agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
