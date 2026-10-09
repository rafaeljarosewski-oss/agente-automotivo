import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente Supabase do usuário logado (respeita RLS).
 * Use em Server Components, Server Actions e Route Handlers.
 */
export async function criarClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component: a renovação da sessão é feita no proxy.ts
        }
      },
    },
  });
}

export type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;
