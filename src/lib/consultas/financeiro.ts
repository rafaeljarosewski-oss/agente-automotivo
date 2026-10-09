import "server-only";

import { hojeISO } from "@/lib/dominio/datas";
import type { ClienteSupabase } from "@/lib/supabase/server";
import type { Tabela } from "@/lib/supabase/tipos";

export type FiltroTitulo = "abertos" | "vencidos" | "pagos" | "todos";

export interface LinhaReceber extends Tabela<"contas_receber"> {
  cliente: string | null;
  os_numero: number | null;
  vencido: boolean;
}

export async function listarReceber(supabase: ClienteSupabase, filtro: FiltroTitulo, limite = 1000): Promise<LinhaReceber[]> {
  const hoje = hojeISO();
  let c = supabase.from("contas_receber").select("*, clientes(nome), ordens_servico(numero)").order("vencimento").limit(limite);
  if (filtro === "abertos") c = c.eq("status", "aberto");
  if (filtro === "vencidos") c = c.eq("status", "aberto").lt("vencimento", hoje);
  if (filtro === "pagos") c = c.eq("status", "pago").order("pago_em", { ascending: false });
  const { data, error } = await c;
  if (error) throw error;
  return (data ?? []).map(({ clientes, ordens_servico, ...t }) => ({
    ...t,
    cliente: clientes?.nome ?? null,
    os_numero: ordens_servico?.numero ?? null,
    vencido: t.status === "aberto" && t.vencimento < hoje,
  }));
}

export interface LinhaPagar extends Tabela<"contas_pagar"> {
  categoria: string | null;
  vencido: boolean;
}

export async function listarPagar(supabase: ClienteSupabase, filtro: FiltroTitulo, limite = 1000): Promise<LinhaPagar[]> {
  const hoje = hojeISO();
  let c = supabase.from("contas_pagar").select("*, categorias_financeiras(nome)").is("deleted_at", null).order("vencimento").limit(limite);
  if (filtro === "abertos") c = c.eq("status", "aberto");
  if (filtro === "vencidos") c = c.eq("status", "aberto").lt("vencimento", hoje);
  if (filtro === "pagos") c = c.eq("status", "pago");
  const { data, error } = await c;
  if (error) throw error;
  return (data ?? []).map(({ categorias_financeiras, ...t }) => ({
    ...t,
    categoria: categorias_financeiras?.nome ?? null,
    vencido: t.status === "aberto" && t.vencimento < hoje,
  }));
}
