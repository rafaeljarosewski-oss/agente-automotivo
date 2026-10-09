"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { executarAcao, verificar } from "@/lib/servidor/acao";
import { falha, sucesso } from "@/lib/servidor/resultado";
import { schemaEmpresa, type EmpresaEntrada } from "@/lib/validacao/empresa";

export async function salvarEmpresa(entrada: EmpresaEntrada) {
  return executarAcao({ papeis: ["admin"], schema: schemaEmpresa, entrada }, async (dados, { supabase, sessao }) => {
    verificar(await supabase.from("empresas").update(dados).eq("id", sessao.empresa.id).select("id").single());
    revalidatePath("/", "layout");
    return sucesso(undefined, "Dados da empresa salvos.");
  });
}

const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp"];

export async function enviarLogo(formData: FormData) {
  return executarAcao({ papeis: ["admin"], schema: z.object({}), entrada: {} }, async (_d, { supabase, sessao }) => {
    const arquivo = formData.get("logo");
    if (!(arquivo instanceof File) || arquivo.size === 0) return falha("Selecione uma imagem.");
    if (!TIPOS_IMAGEM.includes(arquivo.type)) return falha("Use uma imagem PNG, JPG ou WEBP.");
    if (arquivo.size > 2 * 1024 * 1024) return falha("A imagem deve ter no máximo 2 MB.");
    const ext = arquivo.type.split("/")[1];
    const caminho = `${sessao.empresa.id}/logo/logo-${Date.now()}.${ext}`;
    verificar(await supabase.storage.from("empresa").upload(caminho, arquivo, { contentType: arquivo.type, upsert: true }));
    verificar(await supabase.from("empresas").update({ logo_path: caminho }).eq("id", sessao.empresa.id).select("id").single());
    revalidatePath("/configuracoes/empresa");
    return sucesso(undefined, "Logotipo atualizado.");
  });
}
