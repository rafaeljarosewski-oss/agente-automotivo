"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { traduzirErro } from "@/lib/servidor/erros";
import { falha, type Resultado } from "@/lib/servidor/resultado";
import { criarClienteServidor } from "@/lib/supabase/server";

const schemaLogin = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  senha: z.string().min(1, "Informe a senha."),
  redirect: z.string().optional(),
});

export async function entrar(entrada: z.input<typeof schemaLogin>): Promise<Resultado> {
  const dados = schemaLogin.safeParse(entrada);
  if (!dados.success) return falha(dados.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email: dados.data.email, password: dados.data.senha });
  if (error) return falha(traduzirErro(error));

  const { data: perfil } = await supabase.from("perfis").select("ativo").eq("id", data.user.id).maybeSingle();
  if (!perfil?.ativo) {
    await supabase.auth.signOut();
    return falha("Seu usuário está desativado ou não está vinculado a nenhuma oficina. Fale com o administrador.");
  }

  const destino = dados.data.redirect?.startsWith("/") && !dados.data.redirect.startsWith("//") ? dados.data.redirect : "/";
  redirect(destino);
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
