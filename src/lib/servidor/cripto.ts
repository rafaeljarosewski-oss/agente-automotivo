import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { envServidor } from "@/lib/env.server";

/**
 * Criptografia simétrica (AES-256-GCM) para segredos guardados no banco (ex.: CSC da NFC-e).
 * Formato: v1.<iv base64>.<tag base64>.<conteúdo base64>
 */

function chave(): Buffer {
  const k = Buffer.from(envServidor.chaveCriptografia, "base64");
  if (k.length !== 32) throw new Error("APP_ENCRYPTION_KEY deve ter 32 bytes em base64.");
  return k;
}

export function criptografar(texto: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chave(), iv);
  const conteudo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), conteudo.toString("base64")].join(".");
}

export function descriptografar(valor: string): string {
  const [versao, iv, tag, conteudo] = valor.split(".");
  if (versao !== "v1" || !iv || !tag || !conteudo) throw new Error("Valor criptografado inválido.");
  const decifra = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
  decifra.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decifra.update(Buffer.from(conteudo, "base64")), decifra.final()]).toString("utf8");
}
