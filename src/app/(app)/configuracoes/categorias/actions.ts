"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { executarAcao, verificar } from "@/lib/servidor/acao";
import { sucesso } from "@/lib/servidor/resultado";
import { textoObrigatorio, uuid, uuidOpcional } from "@/lib/validacao/comum";

const schema = z.object({ id: uuidOpcional, nome: textoObrigatorio("o nome"), ordem: z.coerce.number().int().default(0), ativo: z.boolean().default(true) });

export async function salvarCategoria(entrada: z.input<typeof schema>) {
  return executarAcao({ papeis: ["admin"], schema, entrada }, async ({ id, ...dados }, { supabase }) => {
    if (id) verificar(await supabase.from("categorias_veiculo").update(dados).eq("id", id).select("id").single());
    else verificar(await supabase.from("categorias_veiculo").insert(dados).select("id").single());
    revalidatePath("/configuracoes/categorias");
    return sucesso(undefined, "Categoria salva.");
  });
}

export async function excluirCategoria(id: string) {
  return executarAcao({ papeis: ["admin"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    verificar(
      await supabase.from("categorias_veiculo").update({ deleted_at: new Date().toISOString() }).eq("id", idValido).select("id").single(),
    );
    revalidatePath("/configuracoes/categorias");
    return sucesso(undefined, "Categoria excluída.");
  });
}
