import "server-only";

import { hojeISO, primeiroDiaDoMes } from "@/lib/dominio/datas";
import type { ClienteSupabase } from "@/lib/supabase/server";
import { listarNotas } from "./notas";

export type TipoRelatorio = "faturamento" | "vendidos" | "comissoes" | "notas";

export function periodoPadrao(inicio?: string, fim?: string): { inicio: string; fim: string } {
  const valido = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const hoje = hojeISO();
  const i = valido(inicio) ?? primeiroDiaDoMes(hoje);
  const f = valido(fim) ?? hoje;
  return i <= f ? { inicio: i, fim: f } : { inicio: f, fim: i };
}

export async function relatorioFaturamento(supabase: ClienteSupabase, inicio: string, fim: string) {
  const { data, error } = await supabase.rpc("relatorio_faturamento", { p_inicio: inicio, p_fim: fim });
  if (error) throw error;
  return data ?? [];
}

export async function relatorioVendidos(supabase: ClienteSupabase, inicio: string, fim: string) {
  const { data, error } = await supabase.rpc("relatorio_mais_vendidos", { p_inicio: inicio, p_fim: fim });
  if (error) throw error;
  return (data ?? []).map((l) => ({ ...l, quantidade: Number(l.quantidade) }));
}

export async function relatorioComissoes(supabase: ClienteSupabase, inicio: string, fim: string) {
  const { data, error } = await supabase.rpc("relatorio_comissoes", { p_inicio: inicio, p_fim: fim });
  if (error) throw error;
  return data ?? [];
}

export async function relatorioNotas(supabase: ClienteSupabase, inicio: string, fim: string) {
  return listarNotas(supabase, { inicio, fim, limite: 50000 });
}
