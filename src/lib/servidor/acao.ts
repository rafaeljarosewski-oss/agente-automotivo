import "server-only";

import { z } from "zod";

import type { PapelUsuario } from "@/lib/supabase/tipos";
import { traduzirErro } from "./erros";
import { falha, type Resultado } from "./resultado";
import { obterSessao, type Sessao } from "./sessao";
import { criarClienteServidor, type ClienteSupabase } from "@/lib/supabase/server";

interface Contexto {
  sessao: Sessao;
  supabase: ClienteSupabase;
}

/** Converte erros do Zod em { campo: mensagem } */
export function errosDeCampo(erro: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const issue of erro.issues) {
    const chave = issue.path.join(".");
    if (!campos[chave]) campos[chave] = issue.message;
  }
  return campos;
}

/**
 * Executa uma Server Action com: usuário logado, papel permitido, validação Zod e tradução de erros.
 */
export async function executarAcao<S extends z.ZodType, T>(
  opcoes: { papeis?: PapelUsuario[]; schema: S; entrada: unknown },
  fn: (dados: z.output<S>, ctx: Contexto) => Promise<Resultado<T>>,
): Promise<Resultado<T>> {
  const sessao = await obterSessao();
  if (!sessao) return falha("Sua sessão expirou. Entre novamente.");
  if (opcoes.papeis && !opcoes.papeis.includes(sessao.perfil.papel)) {
    return falha("Você não tem permissão para esta ação.");
  }
  const validacao = opcoes.schema.safeParse(opcoes.entrada);
  if (!validacao.success) {
    const campos = errosDeCampo(validacao.error);
    return falha(Object.values(campos)[0] ?? "Dados inválidos.", campos);
  }
  try {
    const supabase = await criarClienteServidor();
    return await fn(validacao.data, { sessao, supabase });
  } catch (e) {
    // Redirecionamentos do Next (redirect/notFound) precisam continuar propagando
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    console.error("[acao]", e);
    return falha(traduzirErro(e));
  }
}

/** Lança o erro do Supabase (para ser traduzido por executarAcao) */
export function verificar<R extends { data: unknown; error: unknown }>(resposta: R): NonNullable<R["data"]> {
  if (resposta.error) throw resposta.error;
  return resposta.data as NonNullable<R["data"]>;
}
