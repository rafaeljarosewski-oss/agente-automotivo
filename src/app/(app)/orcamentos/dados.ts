import "server-only";

import type { ClienteResumo } from "@/app/(app)/acoes-comuns";
import type { ClienteSupabase } from "@/lib/supabase/server";

export async function clienteResumo(supabase: ClienteSupabase, id: string | undefined | null): Promise<ClienteResumo | null> {
  if (!id) return null;
  const { data } = await supabase.from("clientes").select("id, nome, cpf_cnpj, whatsapp, telefone").eq("id", id).is("deleted_at", null).maybeSingle();
  return data ? { ...data, placas: null } : null;
}

export async function categoriaDoVeiculo(supabase: ClienteSupabase, id: string | undefined | null): Promise<string | null> {
  if (!id) return null;
  const { data } = await supabase.from("veiculos").select("categoria_id").eq("id", id).maybeSingle();
  return data?.categoria_id ?? null;
}
