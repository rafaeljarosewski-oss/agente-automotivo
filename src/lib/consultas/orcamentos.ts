import "server-only";

import { normalizarBusca } from "@/lib/dominio/texto";
import type { ClienteSupabase } from "@/lib/supabase/server";
import type { StatusOrcamento } from "@/lib/supabase/tipos";

export interface LinhaOrcamento {
  id: string;
  numero: number;
  status: StatusOrcamento;
  created_at: string;
  validade: string;
  total_centavos: number;
  cliente: string;
  veiculo: string | null;
  placa: string | null;
}

export async function listarOrcamentos(
  supabase: ClienteSupabase,
  { termo, status, limite = 500 }: { termo?: string; status?: StatusOrcamento; limite?: number },
): Promise<LinhaOrcamento[]> {
  let consulta = supabase
    .from("orcamentos")
    .select("id, numero, status, created_at, validade, total_centavos, clientes!inner(nome, busca), veiculos(placa, marca, modelo)")
    .is("deleted_at", null)
    .order("numero", { ascending: false })
    .limit(limite);
  if (status) consulta = consulta.eq("status", status);
  const t = termo?.trim();
  if (t) {
    if (/^\d+$/.test(t)) consulta = consulta.eq("numero", Number(t));
    else consulta = consulta.ilike("clientes.busca", `%${normalizarBusca(t)}%`);
  }
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []).map((o) => ({
    id: o.id,
    numero: o.numero,
    status: o.status,
    created_at: o.created_at,
    validade: o.validade,
    total_centavos: o.total_centavos,
    cliente: o.clientes.nome,
    veiculo: o.veiculos ? [o.veiculos.marca, o.veiculos.modelo].filter(Boolean).join(" ") : null,
    placa: o.veiculos?.placa ?? null,
  }));
}
