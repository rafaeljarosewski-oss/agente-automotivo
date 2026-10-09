/**
 * Assinatura HMAC-SHA256 dos webhooks fiscais.
 * Cabeçalho: x-fiscal-signature: t=<unix>,v1=<hex(hmac_sha256(segredo, "<t>.<corpo>"))>
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const CABECALHO_ASSINATURA = "x-fiscal-signature";
const TOLERANCIA_SEGUNDOS = 300;

export function assinarWebhook(segredo: string, corpo: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const hmac = createHmac("sha256", segredo).update(`${timestamp}.${corpo}`).digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

export function verificarAssinatura(
  segredo: string,
  corpo: string,
  cabecalho: string | null | undefined,
  agora = Math.floor(Date.now() / 1000),
): { valida: boolean; motivo?: string } {
  if (!segredo) return { valida: false, motivo: "Segredo do webhook não configurado." };
  if (!cabecalho) return { valida: false, motivo: "Assinatura ausente." };
  const partes = Object.fromEntries(
    cabecalho.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(partes.t);
  const v1 = partes.v1;
  if (!Number.isFinite(t) || !v1) return { valida: false, motivo: "Assinatura mal formada." };
  if (Math.abs(agora - t) > TOLERANCIA_SEGUNDOS) return { valida: false, motivo: "Assinatura expirada." };
  const esperado = createHmac("sha256", segredo).update(`${t}.${corpo}`).digest();
  let recebido: Buffer;
  try {
    recebido = Buffer.from(v1, "hex");
  } catch {
    return { valida: false, motivo: "Assinatura mal formada." };
  }
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) {
    return { valida: false, motivo: "Assinatura inválida." };
  }
  return { valida: true };
}
