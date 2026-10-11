import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { envServidor } from "@/lib/env.server";
import type { Database } from "./database.types";

/**
 * Cliente com a chave secreta (ignora RLS). Use SOMENTE no servidor e apenas para:
 * criação de usuários, links públicos com token, webhooks e rotinas agendadas.
 * Sempre filtre explicitamente por empresa_id ao usar este cliente.
 */
export function criarClienteAdmin() {
  return createClient<Database>(env.supabaseUrl, envServidor.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ClienteAdmin = ReturnType<typeof criarClienteAdmin>;
