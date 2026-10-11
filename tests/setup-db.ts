import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

// Carrega o .env.local gerado pelo `npm run setup` (ou as variáveis já definidas no CI)
const arquivo = path.resolve(__dirname, "..", ".env.local");
if (existsSync(arquivo)) {
  for (const linha of readFileSync(arquivo, "utf8").split("\n")) {
    const i = linha.indexOf("=");
    if (i > 0 && !linha.trim().startsWith("#")) {
      const chave = linha.slice(0, i).trim();
      process.env[chave] ??= linha.slice(i + 1).trim();
    }
  }
}

if (!process.env.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Supabase local não configurado. Rode `npm run setup` (ou `npm run db:start`) antes de `npm run test:db`.");
}
