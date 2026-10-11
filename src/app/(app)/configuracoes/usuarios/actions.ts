"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { executarAcao, verificar } from "@/lib/servidor/acao";
import { traduzirErro } from "@/lib/servidor/erros";
import { falha, sucesso } from "@/lib/servidor/resultado";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { telefoneOpcional, textoObrigatorio, uuid } from "@/lib/validacao/comum";

const papel = z.enum(["admin", "atendente", "instalador"], { error: "Escolha o perfil." });
const senha = z.string().min(8, "A senha deve ter pelo menos 8 caracteres.");

const schemaNovo = z.object({
  nome: textoObrigatorio("o nome"),
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  telefone: telefoneOpcional,
  papel,
  senha,
});

export async function criarUsuario(entrada: z.input<typeof schemaNovo>) {
  return executarAcao({ papeis: ["admin"], schema: schemaNovo, entrada }, async (dados, { sessao }) => {
    const admin = criarClienteAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email: dados.email,
      password: dados.senha,
      email_confirm: true,
      user_metadata: { nome: dados.nome },
    });
    if (error) return falha(traduzirErro(error));
    const { error: e2 } = await admin.from("perfis").insert({
      id: data.user.id,
      empresa_id: sessao.empresa.id,
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      papel: dados.papel,
      created_by: sessao.usuarioId,
    });
    if (e2) {
      await admin.auth.admin.deleteUser(data.user.id);
      return falha(traduzirErro(e2));
    }
    revalidatePath("/configuracoes/usuarios");
    return sucesso(undefined, "Usuário criado. Envie o e-mail e a senha para a pessoa.");
  });
}

const schemaEdicao = z.object({ id: uuid, nome: textoObrigatorio("o nome"), telefone: telefoneOpcional, papel, ativo: z.boolean() });

export async function atualizarUsuario(entrada: z.input<typeof schemaEdicao>) {
  return executarAcao({ papeis: ["admin"], schema: schemaEdicao, entrada }, async (dados, { supabase, sessao }) => {
    if (dados.id === sessao.usuarioId && (dados.papel !== "admin" || !dados.ativo)) {
      return falha("Você não pode remover o seu próprio acesso de administrador.");
    }
    verificar(
      await supabase
        .from("perfis")
        .update({ nome: dados.nome, telefone: dados.telefone, papel: dados.papel, ativo: dados.ativo })
        .eq("id", dados.id)
        .select("id")
        .single(),
    );
    revalidatePath("/configuracoes/usuarios");
    return sucesso(undefined, "Usuário atualizado.");
  });
}

const schemaSenha = z.object({ id: uuid, senha });

export async function redefinirSenha(entrada: z.input<typeof schemaSenha>) {
  return executarAcao({ papeis: ["admin"], schema: schemaSenha, entrada }, async (dados, { supabase }) => {
    // Confirma (via RLS) que o usuário é da mesma empresa antes de usar a chave de serviço
    const { data: perfil } = await supabase.from("perfis").select("id").eq("id", dados.id).maybeSingle();
    if (!perfil) return falha("Usuário não encontrado.");
    const { error } = await criarClienteAdmin().auth.admin.updateUserById(dados.id, { password: dados.senha });
    if (error) return falha(traduzirErro(error));
    return sucesso(undefined, "Senha redefinida.");
  });
}
