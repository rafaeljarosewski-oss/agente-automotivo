"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { env } from "@/lib/env";
import { executarAcao } from "@/lib/servidor/acao";
import { traduzirErro } from "@/lib/servidor/erros";
import { falha, sucesso } from "@/lib/servidor/resultado";

const schemaMinhaSenha = z
  .object({
    atual: z.string().min(1, "Informe a senha atual."),
    nova: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres."),
    confirmacao: z.string(),
  })
  .refine((d) => d.nova === d.confirmacao, { path: ["confirmacao"], message: "As senhas não conferem." })
  .refine((d) => d.nova !== d.atual, { path: ["nova"], message: "A nova senha deve ser diferente da atual." });

/** O próprio usuário troca a senha (ex.: a senha temporária recebida no cadastro da loja) */
export async function alterarMinhaSenha(entrada: z.input<typeof schemaMinhaSenha>) {
  return executarAcao({ schema: schemaMinhaSenha, entrada }, async (dados, { supabase, sessao }) => {
    // Confere a senha atual num cliente isolado, sem mexer nos cookies da sessão
    const conferencia = createClient(env.supabaseUrl, env.supabasePublishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: erroAtual } = await conferencia.auth.signInWithPassword({ email: sessao.perfil.email, password: dados.atual });
    if (erroAtual) return falha("Senha atual incorreta.", { atual: "Senha atual incorreta." });
    // Encerra só a sessão de conferência (o padrão "global" derrubaria também a sessão do navegador)
    await conferencia.auth.signOut({ scope: "local" });

    const { error } = await supabase.auth.updateUser({ password: dados.nova });
    if (error) return falha(traduzirErro(error));
    return sucesso(undefined, "Senha alterada.");
  });
}
