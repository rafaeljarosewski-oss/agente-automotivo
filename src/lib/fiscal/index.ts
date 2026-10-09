import "server-only";

import { envServidor } from "@/lib/env.server";
import { ProvedorApiFiscal } from "./api";
import { MockFiscalProvider } from "./mock";
import type { FiscalProvider } from "./tipos";

let instancia: FiscalProvider | null = null;

/** Provedor fiscal configurado em FISCAL_PROVIDER (mock | acbr | nuvemfiscal) */
export function obterProvedorFiscal(): FiscalProvider {
  if (instancia) return instancia;
  const provedor = envServidor.fiscal.provedor;
  if (provedor === "acbr" || provedor === "nuvemfiscal") {
    instancia = new ProvedorApiFiscal({
      variante: provedor,
      clientId: envServidor.fiscal.clientId,
      clientSecret: envServidor.fiscal.clientSecret,
      escopos: envServidor.fiscal.escopos,
      credencial: process.env.FISCAL_CREDENCIAL === "producao" ? "producao" : "sandbox",
      urlApi: process.env.FISCAL_API_URL || undefined,
      urlToken: process.env.FISCAL_TOKEN_URL || undefined,
    });
  } else {
    instancia = new MockFiscalProvider();
  }
  return instancia;
}

export * from "./tipos";
