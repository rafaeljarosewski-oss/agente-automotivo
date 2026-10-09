"use client";

import { useForm } from "react-hook-form";
import { KeyRoundIcon, Loader2Icon } from "lucide-react";

import { Campo } from "@/components/formulario/campo";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { alterarMinhaSenha } from "./actions";

export function FormularioSenha() {
  const form = useForm({ defaultValues: { atual: "", nova: "", confirmacao: "" } });
  const { pendente, executar } = useAcao();
  const erros = form.formState.errors;
  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((v) => executar(() => alterarMinhaSenha(v), { form, aoConcluir: () => form.reset() }))}>
      <Campo rotulo="Senha atual" nome="atual" erro={erros.atual?.message}>
        <Input type="password" autoComplete="current-password" {...form.register("atual")} />
      </Campo>
      <Campo rotulo="Nova senha" nome="nova" erro={erros.nova?.message} ajuda="Mínimo de 8 caracteres.">
        <Input type="password" autoComplete="new-password" {...form.register("nova")} />
      </Campo>
      <Campo rotulo="Confirme a nova senha" nome="confirmacao" erro={erros.confirmacao?.message}>
        <Input type="password" autoComplete="new-password" {...form.register("confirmacao")} />
      </Campo>
      <div>
        <Button type="submit" disabled={pendente}>
          {pendente ? <Loader2Icon className="animate-spin" /> : <KeyRoundIcon />} Alterar senha
        </Button>
      </div>
    </form>
  );
}
