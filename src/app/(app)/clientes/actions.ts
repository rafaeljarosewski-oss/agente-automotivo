"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { executarAcao, verificar } from "@/lib/servidor/acao";
import { sucesso } from "@/lib/servidor/resultado";
import { uuid } from "@/lib/validacao/comum";
import { schemaCliente, schemaVeiculo, type ClienteEntrada, type VeiculoEntrada } from "@/lib/validacao/cliente";

export async function salvarCliente(entrada: ClienteEntrada, opcoes: { redirecionar?: boolean } = {}) {
  const r = await executarAcao({ papeis: ["admin", "atendente"], schema: schemaCliente, entrada }, async ({ id, ...dados }, { supabase }) => {
    const salvo = id
      ? verificar(await supabase.from("clientes").update(dados).eq("id", id).select("id, nome").single())
      : verificar(await supabase.from("clientes").insert(dados).select("id, nome").single());
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${salvo.id}`);
    return sucesso(salvo, id ? "Cliente atualizado." : "Cliente cadastrado.");
  });
  if (r.ok && opcoes.redirecionar) redirect(`/clientes/${r.dados.id}`);
  return r;
}

export async function excluirCliente(id: string) {
  const r = await executarAcao({ papeis: ["admin", "atendente"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    const agora = new Date().toISOString();
    verificar(await supabase.from("clientes").update({ deleted_at: agora }).eq("id", idValido).select("id").single());
    await supabase.from("veiculos").update({ deleted_at: agora }).eq("cliente_id", idValido).is("deleted_at", null);
    revalidatePath("/clientes");
    return sucesso(undefined, "Cliente excluído.");
  });
  if (r.ok) redirect("/clientes");
  return r;
}

export async function salvarVeiculo(entrada: VeiculoEntrada) {
  return executarAcao({ papeis: ["admin", "atendente"], schema: schemaVeiculo, entrada }, async ({ id, ...dados }, { supabase }) => {
    const salvo = id
      ? verificar(await supabase.from("veiculos").update(dados).eq("id", id).select("id").single())
      : verificar(await supabase.from("veiculos").insert(dados).select("id").single());
    revalidatePath(`/clientes/${dados.cliente_id}`);
    revalidatePath(`/veiculos/${salvo.id}`);
    return sucesso(salvo, id ? "Veículo atualizado." : "Veículo cadastrado.");
  });
}

export async function excluirVeiculo(id: string) {
  return executarAcao({ papeis: ["admin", "atendente"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    const v = verificar(
      await supabase.from("veiculos").update({ deleted_at: new Date().toISOString() }).eq("id", idValido).select("cliente_id").single(),
    );
    revalidatePath(`/clientes/${v.cliente_id}`);
    return sucesso(undefined, "Veículo excluído.");
  });
}
