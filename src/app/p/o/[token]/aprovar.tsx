"use client";

import { useState } from "react";
import { CheckCircle2Icon, Loader2Icon, ThumbsUpIcon } from "lucide-react";

import { Confirmar } from "@/components/comum/confirmar";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { aprovarPeloCliente } from "./actions";

export function BotaoAprovar({ token }: { token: string }) {
  const { pendente, executar } = useAcao();
  const [aprovado, setAprovado] = useState(false);
  if (aprovado) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-md bg-success/10 p-3 text-sm font-medium text-success sm:col-span-2">
        <CheckCircle2Icon className="size-4" /> Obrigado! Recebemos sua aprovação.
      </p>
    );
  }
  return (
    <Confirmar titulo="Aprovar este orçamento?" descricao="A oficina será avisada e entrará em contato para agendar o serviço." textoConfirmar="Aprovar" aoConfirmar={() => executar(() => aprovarPeloCliente(token), { aoConcluir: () => setAprovado(true) })}>
      <Button size="lg" variant="success" disabled={pendente}>
        {pendente ? <Loader2Icon className="animate-spin" /> : <ThumbsUpIcon />} Aprovar orçamento
      </Button>
    </Confirmar>
  );
}
