import "server-only";

import { normalizarBusca } from "@/lib/dominio/texto";
import type { ClienteSupabase } from "@/lib/supabase/server";
import type { StatusNota, TipoNota } from "@/lib/supabase/tipos";

export interface LinhaNota {
  id: string;
  tipo: TipoNota;
  status: StatusNota;
  numero: string | null;
  serie: string | null;
  chave: string | null;
  data_emissao: string | null;
  created_at: string;
  valor_total_centavos: number;
  valor_ibs_centavos: number;
  valor_cbs_centavos: number;
  ambiente: "homologacao" | "producao";
  cliente: string | null;
  os_numero: number | null;
  motivo_amigavel: string | null;
}

export async function listarNotas(
  supabase: ClienteSupabase,
  f: { termo?: string; status?: StatusNota; tipo?: TipoNota; inicio?: string; fim?: string; limite?: number },
): Promise<LinhaNota[]> {
  let c = supabase
    .from("notas_fiscais")
    .select("id, tipo, status, numero, serie, chave, data_emissao, created_at, valor_total_centavos, valor_ibs_centavos, valor_cbs_centavos, ambiente, motivo_amigavel, clientes(nome, busca), ordens_servico(numero)")
    .order("created_at", { ascending: false })
    .limit(f.limite ?? 500);
  if (f.status) c = c.eq("status", f.status);
  if (f.tipo) c = c.eq("tipo", f.tipo);
  if (f.inicio) c = c.gte("created_at", `${f.inicio}T00:00:00-03:00`);
  if (f.fim) c = c.lte("created_at", `${f.fim}T23:59:59-03:00`);
  const t = f.termo?.trim();
  if (t) {
    if (/^\d+$/.test(t)) c = c.eq("numero", t);
    else c = c.ilike("clientes.busca", `%${normalizarBusca(t)}%`).not("clientes", "is", null);
  }
  const { data, error } = await c;
  if (error) throw error;
  return (data ?? []).map(({ clientes, ordens_servico, ...n }) => ({ ...n, cliente: clientes?.nome ?? null, os_numero: ordens_servico?.numero ?? null }));
}
