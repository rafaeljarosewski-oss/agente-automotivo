#!/usr/bin/env node
/**
 * npm run setup — sobe o ambiente local do zero:
 *   1. instala as dependências
 *   2. sobe o Supabase local (Docker)
 *   3. aplica as migrações (db reset)
 *   4. gera o .env.local com as chaves locais
 *   5. roda o seed com dados de demonstração
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function passo(titulo) {
  console.log(`\n\x1b[1;34m▶ ${titulo}\x1b[0m`);
}

function rodar(cmd, args, opcoes = {}) {
  const r = spawnSync(cmd, args, { cwd: raiz, stdio: "inherit", shell: process.platform === "win32", ...opcoes });
  if (r.status !== 0) {
    console.error(`\n\x1b[31m✖ Falhou: ${cmd} ${args.join(" ")}\x1b[0m`);
    process.exit(r.status ?? 1);
  }
  return r;
}

// 0. Pré-requisitos
const [maior, menor] = process.versions.node.split(".").map(Number);
if (maior < 20 || (maior === 20 && menor < 9)) {
  console.error("Node.js 20.9 ou superior é necessário. Instale em https://nodejs.org/");
  process.exit(1);
}
const docker = spawnSync("docker", ["info"], { stdio: "ignore", shell: process.platform === "win32" });
if (docker.status !== 0) {
  console.error("O Docker não está rodando. Abra o Docker Desktop (ou inicie o serviço) e rode novamente: npm run setup");
  process.exit(1);
}

passo("1/5 Instalando dependências");
rodar(npm, ["install"]);

const { iniciar, supabase } = await import("./supabase.mjs");

passo("2/5 Subindo o Supabase local (a primeira vez pode demorar alguns minutos)");
if (iniciar() !== 0) {
  console.error("Não foi possível iniciar o Supabase local.");
  process.exit(1);
}

passo("3/5 Aplicando migrações do banco");
const reset = supabase(["db", "reset", "--local", "--yes"]);
if (reset.status !== 0) process.exit(reset.status ?? 1);

passo("4/5 Gerando .env.local");
const status = supabase(["status", "-o", "json"], { capturar: true });
const json = JSON.parse(status.stdout.slice(status.stdout.indexOf("{")));
const arquivoEnv = path.join(raiz, ".env.local");
const atuais = existsSync(arquivoEnv)
  ? Object.fromEntries(
      readFileSync(arquivoEnv, "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
    )
  : {};

const valores = {
  NEXT_PUBLIC_APP_URL: atuais.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: json.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: json.PUBLISHABLE_KEY ?? json.ANON_KEY,
  SUPABASE_SECRET_KEY: json.SECRET_KEY ?? json.SERVICE_ROLE_KEY,
  APP_ENCRYPTION_KEY: atuais.APP_ENCRYPTION_KEY ?? randomBytes(32).toString("base64"),
  CRON_SECRET: atuais.CRON_SECRET ?? randomBytes(24).toString("hex"),
  FISCAL_PROVIDER: atuais.FISCAL_PROVIDER ?? "mock",
  FISCAL_CLIENT_ID: atuais.FISCAL_CLIENT_ID ?? "",
  FISCAL_CLIENT_SECRET: atuais.FISCAL_CLIENT_SECRET ?? "",
  FISCAL_WEBHOOK_SECRET: atuais.FISCAL_WEBHOOK_SECRET ?? randomBytes(24).toString("hex"),
};
const extras = Object.entries(atuais).filter(([k]) => !(k in valores));
const conteudo =
  "# Gerado por `npm run setup` (ambiente local). Não versione este arquivo.\n" +
  [...Object.entries(valores), ...extras].map(([k, v]) => `${k}=${v}`).join("\n") +
  "\n";
writeFileSync(arquivoEnv, conteudo);
console.log("  .env.local atualizado.");

passo("5/5 Populando dados de demonstração");
rodar(npm, ["run", "db:seed"]);

console.log(`
\x1b[1;32m✔ Ambiente pronto!\x1b[0m

  Rode:            npm run dev
  Acesse:          http://localhost:3000
  Logins de teste: docs/ACESSOS_DEMO.md
  Banco (Studio):  http://127.0.0.1:54323
`);
