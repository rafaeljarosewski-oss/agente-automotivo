"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, LogInIcon } from "lucide-react";

import { Campo } from "@/components/formulario/campo";
import { useAcao } from "@/components/formulario/usar-acao";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { entrar } from "./actions";

export function FormularioLogin() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const { pendente, erro, executar } = useAcao();

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        executar(() => entrar({ email, senha, redirect: params.get("redirect") ?? undefined }), { silencioso: true });
      }}
    >
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}
      <Campo rotulo="E-mail" nome="email">
        <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Campo>
      <Campo rotulo="Senha" nome="senha">
        <Input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
      </Campo>
      <Button type="submit" size="lg" disabled={pendente}>
        {pendente ? <Loader2Icon className="animate-spin" /> : <LogInIcon />}
        Entrar
      </Button>
    </form>
  );
}
