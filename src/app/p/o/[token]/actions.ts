"use server";

import { revalidatePath } from "next/cache";

import { falha, sucesso, type Resultado } from "@/lib/servidor/resultado";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/** O próprio cliente aprova o orçamento pelo link público */
export async function aprovarPeloCliente(token: string): Promise<Resultado> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return falha("Link inválido.");
  const admin = criarClienteAdmin();
  const { data: orc } = await admin.from("orcamentos").select("id, status, validade").eq("token_publico", token).is("deleted_at", null).maybeSingle();
  if (!orc) return falha("Orçamento não encontrado.");
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  if (orc.validade < hoje || orc.status === "expirado") return falha("Este orçamento expirou. Fale com a oficina para atualizar os valores.");
  if (!["rascunho", "enviado"].includes(orc.status)) return falha("Este orçamento já foi respondido.");
  const { error } = await admin.from("orcamentos").update({ status: "aprovado", aprovado_em: new Date().toISOString() }).eq("id", orc.id);
  if (error) return falha("Não foi possível registrar a aprovação. Tente novamente.");
  revalidatePath(`/p/o/${token}`);
  return sucesso(undefined, "Orçamento aprovado! A oficina vai entrar em contato para agendar.");
}
