import { randomBytes, randomInt } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { completarCNPJ, completarCPF } from "@/lib/dominio/documentos";
import type { Database } from "@/lib/supabase/database.types";

export type Cliente = SupabaseClient<Database>;

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

export function admin(): Cliente {
  return createClient<Database>(url(), process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonimo(): Cliente {
  return createClient<Database>(url(), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function cnpjAleatorio(): string {
  return completarCNPJ(String(randomInt(10_000_000, 99_999_999)) + "0001");
}

export function cpfAleatorio(): string {
  return completarCPF(String(randomInt(100_000_000, 999_999_999)));
}

export function placaAleatoria(): string {
  const l = () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[randomInt(0, 26)];
  return `${l()}${l()}${l()}${randomInt(0, 10)}${l()}${randomInt(10, 100)}`;
}

export interface EmpresaTeste {
  id: string;
  nome: string;
  usuarios: Record<"admin" | "atendente" | "instalador", { id: string; email: string; cliente: Cliente }>;
}

/** Cria uma empresa isolada com um usuário de cada papel e devolve clientes já autenticados */
export async function criarEmpresaTeste(nome: string): Promise<EmpresaTeste> {
  const sb = admin();
  const { data: empresa, error } = await sb
    .from("empresas")
    .insert({ razao_social: `${nome} LTDA`, nome_fantasia: nome, cnpj: cnpjAleatorio(), cidade: "Porto Alegre", uf: "RS" })
    .select()
    .single();
  if (error) throw error;

  const usuarios = {} as EmpresaTeste["usuarios"];
  for (const papel of ["admin", "atendente", "instalador"] as const) {
    const email = `${papel}.${randomBytes(4).toString("hex")}@teste.local`;
    const senha = "Senha!Teste123";
    const { data: criado, error: e1 } = await sb.auth.admin.createUser({ email, password: senha, email_confirm: true });
    if (e1) throw e1;
    const { error: e2 } = await sb
      .from("perfis")
      .insert({ id: criado.user.id, empresa_id: empresa.id, nome: `${papel} ${nome}`, email, papel });
    if (e2) throw e2;
    const cliente = anonimo();
    const { error: e3 } = await cliente.auth.signInWithPassword({ email, password: senha });
    if (e3) throw e3;
    usuarios[papel] = { id: criado.user.id, email, cliente };
  }
  return { id: empresa.id, nome, usuarios };
}
