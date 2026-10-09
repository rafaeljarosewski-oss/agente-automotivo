"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { executarAcao, verificar } from "@/lib/servidor/acao";
import { sucesso } from "@/lib/servidor/resultado";
import { textoParaCentavos } from "@/lib/dominio/dinheiro";
import { uuid } from "@/lib/validacao/comum";
import {
  schemaCelulaTabela,
  schemaLinhaPelicula,
  schemaProduto,
  schemaServico,
  type CelulaTabelaEntrada,
  type LinhaPeliculaEntrada,
  type ProdutoEntrada,
  type ServicoEntrada,
} from "@/lib/validacao/catalogo";

export async function salvarProduto(entrada: ProdutoEntrada) {
  const r = await executarAcao({ papeis: ["admin"], schema: schemaProduto, entrada }, async ({ id, ...dados }, { supabase }) => {
    const salvo = id
      ? verificar(await supabase.from("produtos").update(dados).eq("id", id).select("id").single())
      : verificar(await supabase.from("produtos").insert(dados).select("id").single());
    revalidatePath("/catalogo");
    return sucesso({ id: salvo.id, novo: !id }, id ? "Produto atualizado." : "Produto cadastrado.");
  });
  if (r.ok && r.dados.novo) redirect(`/catalogo/produtos/${r.dados.id}`);
  return r;
}

export async function excluirProduto(id: string) {
  const r = await executarAcao({ papeis: ["admin"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    verificar(await supabase.from("produtos").update({ deleted_at: new Date().toISOString(), ativo: false }).eq("id", idValido).select("id").single());
    revalidatePath("/catalogo");
    return sucesso(undefined, "Produto excluído.");
  });
  if (r.ok) redirect("/catalogo?aba=produtos");
  return r;
}

export async function salvarServico(entrada: ServicoEntrada) {
  const r = await executarAcao({ papeis: ["admin"], schema: schemaServico, entrada }, async ({ id, precos_categoria, ...dados }, { supabase }) => {
    const salvo = id
      ? verificar(await supabase.from("servicos").update(dados).eq("id", id).select("id, empresa_id").single())
      : verificar(await supabase.from("servicos").insert(dados).select("id, empresa_id").single());

    if (dados.tipo_preco === "categoria") {
      const linhas = Object.entries(precos_categoria)
        .map(([categoria_id, valor]) => ({ categoria_id, preco: valor === "" || valor == null ? null : textoParaCentavos(valor) }))
        .filter((l) => l.preco !== null && l.preco >= 0) as { categoria_id: string; preco: number }[];
      verificar(await supabase.from("servico_precos_categoria").delete().eq("servico_id", salvo.id));
      if (linhas.length) {
        verificar(
          await supabase
            .from("servico_precos_categoria")
            .insert(linhas.map((l) => ({ servico_id: salvo.id, categoria_id: l.categoria_id, preco_centavos: l.preco }))),
        );
      }
    }
    revalidatePath("/catalogo");
    return sucesso({ id: salvo.id, novo: !id }, id ? "Serviço atualizado." : "Serviço cadastrado.");
  });
  if (r.ok && r.dados.novo) redirect(`/catalogo/servicos/${r.dados.id}`);
  return r;
}

export async function excluirServico(id: string) {
  const r = await executarAcao({ papeis: ["admin"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    verificar(await supabase.from("servicos").update({ deleted_at: new Date().toISOString(), ativo: false }).eq("id", idValido).select("id").single());
    revalidatePath("/catalogo");
    return sucesso(undefined, "Serviço excluído.");
  });
  if (r.ok) redirect("/catalogo?aba=servicos");
  return r;
}

export async function salvarLinhaPelicula(entrada: LinhaPeliculaEntrada) {
  return executarAcao({ papeis: ["admin"], schema: schemaLinhaPelicula, entrada }, async ({ id, ...dados }, { supabase }) => {
    if (id) verificar(await supabase.from("linhas_pelicula").update(dados).eq("id", id).select("id").single());
    else verificar(await supabase.from("linhas_pelicula").insert(dados).select("id").single());
    revalidatePath("/catalogo");
    return sucesso(undefined, "Linha de película salva.");
  });
}

export async function excluirLinhaPelicula(id: string) {
  return executarAcao({ papeis: ["admin"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    verificar(await supabase.from("linhas_pelicula").update({ deleted_at: new Date().toISOString(), ativo: false }).eq("id", idValido).select("id").single());
    revalidatePath("/catalogo");
    return sucesso(undefined, "Linha excluída.");
  });
}

export async function salvarCelulaTabela(entrada: CelulaTabelaEntrada) {
  return executarAcao({ papeis: ["admin"], schema: schemaCelulaTabela, entrada }, async (dados, { supabase }) => {
    verificar(
      await supabase
        .from("tabela_precos_pelicula")
        .upsert(dados, { onConflict: "linha_id,categoria_id" })
        .select("id")
        .single(),
    );
    revalidatePath("/catalogo");
    return sucesso(undefined);
  });
}
