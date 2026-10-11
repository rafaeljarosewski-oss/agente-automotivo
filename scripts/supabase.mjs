#!/usr/bin/env node
/**
 * Wrapper do Supabase CLI local (node_modules/.bin/supabase).
 * - No "start", sobe apenas os serviços usados pelo sistema.
 * - Se o download das imagens pelo registro padrão (public.ecr.aws) falhar,
 *   tenta novamente pelo Docker Hub (útil em redes corporativas com bloqueio).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(raiz, "node_modules", ".bin", process.platform === "win32" ? "supabase.cmd" : "supabase");

export function supabase(args, { capturar = false, env = {} } = {}) {
  const r = spawnSync(bin, args, {
    cwd: raiz,
    stdio: capturar ? ["ignore", "pipe", "pipe"] : "inherit",
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return r;
}

export const SERVICOS_IGNORADOS = ["imgproxy", "vector", "logflare", "supavisor", "edge-runtime", "realtime"];

export function iniciar() {
  const args = ["start", "-x", SERVICOS_IGNORADOS.join(",")];
  let r = supabase(args);
  if (r.status !== 0 && !process.env.SUPABASE_INTERNAL_IMAGE_REGISTRY) {
    console.log("\n⚠️  Falha ao iniciar com o registro padrão. Tentando novamente pelo Docker Hub...\n");
    r = supabase(args, { env: { SUPABASE_INTERNAL_IMAGE_REGISTRY: "docker.io" } });
  }
  return r.status ?? 1;
}

const executadoDiretamente = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (executadoDiretamente) {
  const args = process.argv.slice(2);
  if (args[0] === "start") {
    process.exit(iniciar());
  }
  const r = supabase(args);
  process.exit(r.status ?? 1);
}
