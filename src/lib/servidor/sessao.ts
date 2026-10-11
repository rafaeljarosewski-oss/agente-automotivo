import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { PapelUsuario, Tabela } from "@/lib/supabase/tipos";

export interface Sessao {
  usuarioId: string;
  perfil: Tabela<"perfis">;
  empresa: Tabela<"empresas">;
}

/** Sessão do usuário logado (uma consulta por requisição). Retorna null se não logado. */
export const obterSessao = cache(async (): Promise<Sessao | null> => {
  const supabase = await criarClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const usuarioId = claims?.claims?.sub;
  if (!usuarioId) return null;

  const { data: perfil } = await supabase.from("perfis").select("*").eq("id", usuarioId).maybeSingle();
  if (!perfil || !perfil.ativo) return null;

  const { data: empresa } = await supabase.from("empresas").select("*").eq("id", perfil.empresa_id).maybeSingle();
  if (!empresa || !empresa.ativo) return null;

  return { usuarioId, perfil, empresa };
});

/** Exige usuário logado (e opcionalmente um dos papéis). Redireciona caso contrário. */
export async function exigirSessao(...papeis: PapelUsuario[]): Promise<Sessao> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  if (papeis.length > 0 && !papeis.includes(sessao.perfil.papel)) redirect("/sem-permissao");
  return sessao;
}

export function temPapel(sessao: Sessao, ...papeis: PapelUsuario[]): boolean {
  return papeis.includes(sessao.perfil.papel);
}
