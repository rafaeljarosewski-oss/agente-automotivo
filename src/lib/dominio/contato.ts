import { somenteDigitos } from "./documentos";

/** (51) 98765-4321 / (51) 3333-4444 */
export function formatarTelefone(valor: string | null | undefined): string {
  let d = somenteDigitos(valor);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function validarTelefone(valor: string | null | undefined): boolean {
  const d = somenteDigitos(valor);
  return d.length === 10 || d.length === 11;
}

/** 90010000 → 90010-000 */
export function formatarCEP(valor: string | null | undefined): string {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function validarCEP(valor: string | null | undefined): boolean {
  return somenteDigitos(valor).length === 8;
}

/** Número no formato internacional usado pelo WhatsApp (55 + DDD + número) */
export function numeroWhatsApp(valor: string | null | undefined): string | null {
  let d = somenteDigitos(valor);
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d.length >= 12 && d.length <= 13 ? d : null;
}

/** Link "clique para conversar" do WhatsApp com mensagem pronta */
export function linkWhatsApp(telefone: string | null | undefined, mensagem: string): string {
  const numero = numeroWhatsApp(telefone);
  const texto = encodeURIComponent(mensagem);
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
