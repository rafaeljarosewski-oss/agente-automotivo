import "server-only";

import type { ClienteSupabase } from "@/lib/supabase/server";

export interface LinhaCliente {
  id: string;
  nome: string;
  tipo_pessoa: "PF" | "PJ";
  cpf_cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cidade: string | null;
  placas: string | null;
}

export async function listarClientes(supabase: ClienteSupabase, termo: string | undefined, limite = 300): Promise<LinhaCliente[]> {
  if (termo?.trim()) {
    const { data, error } = await supabase.rpc("buscar_clientes", { p_termo: termo, p_limite: Math.min(limite, 100) });
    if (error) throw error;
    const ids = (data ?? []).map((c) => c.id);
    const cidades = new Map<string, string | null>();
    if (ids.length) {
      const { data: extra } = await supabase.from("clientes").select("id, cidade").in("id", ids);
      extra?.forEach((c) => cidades.set(c.id, c.cidade));
    }
    return (data ?? []).map((c) => ({ ...c, cidade: cidades.get(c.id) ?? null }));
  }
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome, tipo_pessoa, cpf_cnpj, telefone, whatsapp, cidade, veiculos(placa, deleted_at)")
    .is("deleted_at", null)
    .order("nome")
    .limit(limite);
  if (error) throw error;
  return (data ?? []).map(({ veiculos, ...c }) => ({
    ...c,
    placas:
      veiculos
        .filter((v) => !v.deleted_at)
        .map((v) => v.placa)
        .join(", ") || null,
  }));
}
