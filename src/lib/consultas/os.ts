import "server-only";

import { normalizarBusca } from "@/lib/dominio/texto";
import type { ClienteSupabase } from "@/lib/supabase/server";
import type { StatusOS } from "@/lib/supabase/tipos";

export interface LinhaOS {
  id: string;
  numero: number;
  status: StatusOS;
  created_at: string;
  previsao_entrega: string | null;
  concluida_em: string | null;
  total_centavos: number;
  cliente: string;
  veiculo: string | null;
  placa: string | null;
  instalador: string | null;
}

export const STATUS_EM_ANDAMENTO: StatusOS[] = ["aberta", "em_execucao", "aguardando_peca"];

export async function listarOS(
  supabase: ClienteSupabase,
  { termo, status, limite = 500 }: { termo?: string; status?: StatusOS[]; limite?: number },
): Promise<LinhaOS[]> {
  let consulta = supabase
    .from("ordens_servico")
    .select("id, numero, status, created_at, previsao_entrega, concluida_em, total_centavos, clientes!inner(nome, busca), veiculos(placa, marca, modelo), instalador:perfis!ordens_servico_instalador_id_fkey(nome)")
    .is("deleted_at", null)
    .order("numero", { ascending: false })
    .limit(limite);
  if (status?.length) consulta = consulta.in("status", status);
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
    previsao_entrega: o.previsao_entrega,
    concluida_em: o.concluida_em,
    total_centavos: o.total_centavos,
    cliente: o.clientes.nome,
    veiculo: o.veiculos ? [o.veiculos.marca, o.veiculos.modelo].filter(Boolean).join(" ") : null,
    placa: o.veiculos?.placa ?? null,
    instalador: o.instalador?.nome ?? null,
  }));
}
