/** Carrega o .env.local (sem sobrescrever variáveis já definidas no terminal) para os scripts em TS. */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function carregarAmbiente(arquivo = ".env.local") {
  const caminho = path.resolve(process.cwd(), arquivo);
  if (!existsSync(caminho)) return;
  for (const linha of readFileSync(caminho, "utf8").split("\n")) {
    const i = linha.indexOf("=");
    if (i > 0 && !linha.trim().startsWith("#")) process.env[linha.slice(0, i).trim()] ??= linha.slice(i + 1).trim();
  }
}
