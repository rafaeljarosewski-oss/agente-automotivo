"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { Resultado } from "@/lib/servidor/resultado";

/** Parte do React Hook Form usada para marcar erros vindos do servidor */
interface FormularioComErros {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setError: (nome: any, erro: { message: string }) => void;
}

/**
 * Executa uma Server Action mostrando aviso de sucesso/erro e marcando os campos com erro no formulário.
 */
export function useAcao() {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function executar<T>(
    acao: () => Promise<Resultado<T>>,
    opcoes: {
      form?: FormularioComErros;
      sucesso?: string | ((dados: T) => string | undefined);
      aoConcluir?: (dados: T) => void;
      silencioso?: boolean;
    } = {},
  ) {
    setErro(null);
    iniciar(async () => {
      let r: Resultado<T>;
      try {
        r = await acao();
      } catch (e) {
        // redirect() dentro da action chega aqui como erro especial e deve ser propagado
        if (e && typeof e === "object" && "digest" in e) throw e;
        r = { ok: false, erro: "Falha de comunicação com o servidor. Verifique sua internet e tente novamente." };
      }
      if (r.ok) {
        const msg = typeof opcoes.sucesso === "function" ? opcoes.sucesso(r.dados) : (opcoes.sucesso ?? r.mensagem);
        if (msg && !opcoes.silencioso) toast.success(msg);
        opcoes.aoConcluir?.(r.dados);
      } else {
        setErro(r.erro);
        if (r.campos && opcoes.form) {
          for (const [campo, mensagem] of Object.entries(r.campos)) {
            opcoes.form.setError(campo, { message: mensagem });
          }
        }
        if (!opcoes.silencioso) toast.error(r.erro);
      }
    });
  }

  return { pendente, erro, executar };
}
