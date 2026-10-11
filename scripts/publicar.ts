/**
 * Publicação completa, sem perguntas: `npm run publicar`
 *
 * Usa apenas APIs HTTPS (não precisa de conexão direta ao Postgres nem de login interativo):
 *   1. Supabase: cria (ou reaproveita) o projeto, aplica as migrações pendentes, desliga o
 *      cadastro público e lê as chaves.
 *   2. Vercel: cria/vincula o projeto, cadastra as variáveis e publica em produção.
 *   3. Descobre o endereço definitivo do site, ajusta NEXT_PUBLIC_APP_URL (republica se mudou),
 *      a URL do Supabase Auth e agenda a sincronização fiscal a cada 10 minutos (pg_cron).
 *   4. Testa o site publicado.
 *
 * Requer (no terminal, nunca em arquivo versionado):
 *   SUPABASE_ACCESS_TOKEN  https://supabase.com/dashboard/account/tokens
 *   VERCEL_TOKEN           https://vercel.com/account/settings/tokens
 * Opcionais: NOME_PROJETO (padrão orion-oficina), REGIAO (padrão sa-east-1), SUPABASE_ORG_ID, VERCEL_SCOPE.
 * Flags: --so-banco (pula a Vercel).
 *
 * Os valores gerados ficam em .env.producao (fora do Git). Rodar de novo é seguro: reaproveita
 * projeto, senha e segredos e só aplica migrações novas.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const ARQ = path.join(RAIZ, ".env.producao");
const NOME = process.env.NOME_PROJETO ?? "orion-oficina";
const REGIAO = process.env.REGIAO ?? "sa-east-1";
const SO_BANCO = process.argv.includes("--so-banco");
const API_SB = "https://api.supabase.com";
const API_VC = "https://api.vercel.com";
const VERSAO_VERCEL = "63.1.0";

const info = (m: string) => console.log(`→ ${m}`);
const ok = (m: string) => console.log(`  ✓ ${m}`);
function erro(m: string): never {
  console.error(`✖ ${m}`);
  process.exit(1);
}
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TOKEN_SB = process.env.SUPABASE_ACCESS_TOKEN ?? erro("Defina SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens).");
const TOKEN_VC = SO_BANCO ? "" : (process.env.VERCEL_TOKEN ?? erro("Defina VERCEL_TOKEN (https://vercel.com/account/settings/tokens)."));

// ---------------------------------------------------------------------------
// .env.producao
// ---------------------------------------------------------------------------
function lerEnv(): Record<string, string> {
  if (!existsSync(ARQ)) return {};
  const v: Record<string, string> = {};
  for (const linha of readFileSync(ARQ, "utf8").split("\n")) {
    const i = linha.indexOf("=");
    if (i > 0 && !linha.startsWith("#")) v[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
  }
  return v;
}
const env = lerEnv();
function salvarEnv() {
  const ordem = [
    "SUPABASE_PROJECT_REF",
    "SUPABASE_DB_PASSWORD",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "APP_ENCRYPTION_KEY",
    "CRON_SECRET",
    "FISCAL_WEBHOOK_SECRET",
    "FISCAL_PROVIDER",
    "FISCAL_CREDENCIAL",
    "FISCAL_CLIENT_ID",
    "FISCAL_CLIENT_SECRET",
    "RESP_TECNICO_CNPJ",
    "RESP_TECNICO_CONTATO",
    "RESP_TECNICO_EMAIL",
    "RESP_TECNICO_FONE",
  ];
  const extras = Object.keys(env).filter((k) => !ordem.includes(k));
  const linhas = ["# Gerado por scripts/publicar.ts — NÃO versionar (contém segredos). Guarde uma cópia num cofre de senhas."];
  for (const k of [...ordem, ...extras]) linhas.push(`${k}=${env[k] ?? ""}`);
  writeFileSync(ARQ, linhas.join("\n") + "\n", { mode: 0o600 });
  chmodSync(ARQ, 0o600);
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
async function api<T = unknown>(base: string, token: string, metodo: string, caminho: string, corpo?: unknown, tentativas = 3): Promise<T> {
  for (let t = 1; ; t++) {
    let r: Response;
    try {
      r = await fetch(base + caminho, {
        method: metodo,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (e) {
      if (t < tentativas) {
        await esperar(3000 * t);
        continue;
      }
      throw new Error(`${metodo} ${caminho}: ${e instanceof Error ? e.message : e}`);
    }
    const texto = await r.text();
    if (r.ok) return (texto ? JSON.parse(texto) : null) as T;
    if ((r.status >= 500 || r.status === 429) && t < tentativas) {
      await esperar(3000 * t);
      continue;
    }
    throw new Error(`${metodo} ${caminho} → HTTP ${r.status}: ${texto.slice(0, 600)}`);
  }
}
const sb = <T = unknown>(m: string, c: string, corpo?: unknown) => api<T>(API_SB, TOKEN_SB, m, c, corpo);
const vc = <T = unknown>(m: string, c: string, corpo?: unknown) => {
  const escopo = process.env.VERCEL_SCOPE ? `${c.includes("?") ? "&" : "?"}slug=${encodeURIComponent(process.env.VERCEL_SCOPE)}` : "";
  return api<T>(API_VC, TOKEN_VC, m, c + escopo, corpo);
};

function cli(comando: string, args: string[], extraEnv: Record<string, string> = {}, mostrar = true): string {
  const r = spawnSync(comando, args, {
    cwd: RAIZ,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
    stdio: ["ignore", "pipe", mostrar ? "inherit" : "pipe"],
    shell: process.platform === "win32",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    // Nunca exibir segredos (token, senha do banco) na mensagem de erro
    const visiveis = args.map((a, i) => (a.startsWith("--token") || args[i - 1] === "--db-password" ? "***" : a));
    throw new Error(`${comando} ${visiveis.join(" ")} falhou (código ${r.status}).\n${r.stdout ?? ""}\n${r.stderr ?? ""}`);
  }
  return r.stdout ?? "";
}

// ---------------------------------------------------------------------------
// 1. Supabase
// ---------------------------------------------------------------------------
interface Projeto {
  id?: string;
  ref?: string;
  name: string;
  status: string;
  region: string;
}

async function projetoSupabase(): Promise<string> {
  const projetos = await sb<Projeto[]>("GET", "/v1/projects");
  const refSalvo = env.SUPABASE_PROJECT_REF;
  const existente = projetos.find((p) => (p.ref ?? p.id) === refSalvo) ?? projetos.find((p) => p.name === NOME);
  if (existente) {
    const ref = (existente.ref ?? existente.id)!;
    ok(`Projeto Supabase existente: ${existente.name} (${ref}, ${existente.region})`);
    if (!env.SUPABASE_DB_PASSWORD) console.log("  (aviso) senha do banco desconhecida neste computador — não é necessária para publicar.");
    return ref;
  }

  let org = process.env.SUPABASE_ORG_ID;
  if (!org) {
    const orgs = await sb<{ id: string; slug?: string; name: string }[]>("GET", "/v1/organizations");
    // Organização tem de ser criada pelo painel: criada com token pessoal, ela não fica vinculada ao usuário
    if (orgs.length === 0) erro("Nenhuma organização na conta Supabase. Crie uma em https://supabase.com/dashboard/new (plano Free) e rode de novo.");
    if (orgs.length > 1) erro(`Há mais de uma organização (${orgs.map((o) => `${o.slug ?? o.id} = ${o.name}`).join("; ")}). Rode com SUPABASE_ORG_ID=<id>.`);
    org = orgs[0]!.slug ?? orgs[0]!.id;
  }
  env.SUPABASE_DB_PASSWORD ||= randomBytes(24).toString("base64url");
  salvarEnv(); // grava a senha antes de criar, para não perdê-la se algo falhar depois
  info(`Criando o projeto "${NOME}" em ${REGIAO} (leva alguns minutos)...`);
  // A CLI conhece o formato atual do endpoint de criação; o resto do script usa a API diretamente.
  cli("npx", ["--yes", "supabase", "projects", "create", NOME, "--org-id", org, "--db-password", env.SUPABASE_DB_PASSWORD, "--region", REGIAO, "--yes"], {
    SUPABASE_ACCESS_TOKEN: TOKEN_SB,
  });
  const criado = (await sb<Projeto[]>("GET", "/v1/projects")).find((p) => p.name === NOME);
  if (!criado) erro("Projeto criado, mas não encontrado na listagem. Rode de novo em instantes.");
  return (criado.ref ?? criado.id)!;
}

async function aguardarProjeto(ref: string) {
  for (let i = 0; i < 90; i++) {
    const p = await sb<Projeto>("GET", `/v1/projects/${ref}`);
    if (p.status === "ACTIVE_HEALTHY") return;
    if (i === 0) info(`Aguardando o banco ficar pronto (status: ${p.status})...`);
    if (["INACTIVE", "PAUSED"].includes(p.status)) erro(`O projeto está ${p.status}. Reative-o no painel da Supabase e rode de novo.`);
    await esperar(10_000);
  }
  erro("O projeto não ficou pronto em 15 minutos. Veja o painel da Supabase e rode de novo.");
}

const sql = <T = Record<string, unknown>>(ref: string, query: string) => sb<T[]>("POST", `/v1/projects/${ref}/database/query`, { query });
const literal = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function aplicarMigracoes(ref: string) {
  await sql(
    ref,
    `create schema if not exists supabase_migrations;
     create table if not exists supabase_migrations.schema_migrations (version text not null primary key);
     alter table supabase_migrations.schema_migrations add column if not exists statements text[];
     alter table supabase_migrations.schema_migrations add column if not exists name text;`,
  );
  const aplicadas = new Set((await sql<{ version: string }>(ref, "select version from supabase_migrations.schema_migrations")).map((r) => r.version));
  const pasta = path.join(RAIZ, "supabase", "migrations");
  const arquivos = readdirSync(pasta)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();
  let novas = 0;
  for (const arquivo of arquivos) {
    const [, versao, nome] = /^(\d+)_(.+)\.sql$/.exec(arquivo)!;
    if (aplicadas.has(versao!)) continue;
    const conteudo = readFileSync(path.join(pasta, arquivo), "utf8");
    // Uma única requisição = uma transação implícita: a migração e o registro no histórico entram juntos.
    // "set role postgres" deixa os objetos com o mesmo dono que a CLI usaria (db push).
    await sql(
      ref,
      `set role postgres;\n${conteudo}\n;insert into supabase_migrations.schema_migrations (version, name, statements) values (${literal(versao!)}, ${literal(nome!)}, array[${literal(conteudo)}]);`,
    ).catch((e) => erro(`Migração ${arquivo} falhou (nada dela foi aplicado):\n${e instanceof Error ? e.message : e}`));
    ok(`migração ${arquivo}`);
    novas++;
  }
  if (!novas) ok("banco já está atualizado (nenhuma migração nova)");
}

async function chavesSupabase(ref: string) {
  const chaves = await sb<{ name: string; type?: string; api_key: string | null }[]>("GET", `/v1/projects/${ref}/api-keys?reveal=true`);
  const de = (tipo: string, legado: string) => chaves.find((c) => c.type === tipo && c.api_key)?.api_key ?? chaves.find((c) => c.name === legado && c.api_key)?.api_key;
  const publica = de("publishable", "anon");
  const secreta = de("secret", "service_role");
  if (!publica || !secreta) erro("Não encontrei as chaves do projeto. Abra Project Settings › API Keys no painel e crie as chaves publishable e secret.");
  env.NEXT_PUBLIC_SUPABASE_URL = `https://${ref}.supabase.co`;
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publica;
  env.SUPABASE_SECRET_KEY = secreta;
}

async function configurarAuth(ref: string, url: string) {
  await sb("PATCH", `/v1/projects/${ref}/config/auth`, { disable_signup: true, site_url: url });
}

// ---------------------------------------------------------------------------
// 2. Vercel
// ---------------------------------------------------------------------------
const PUBLICAS = ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "FISCAL_PROVIDER", "FISCAL_CREDENCIAL", "RESP_TECNICO_CNPJ", "RESP_TECNICO_CONTATO", "RESP_TECNICO_EMAIL", "RESP_TECNICO_FONE"];
const SECRETAS = ["SUPABASE_SECRET_KEY", "APP_ENCRYPTION_KEY", "CRON_SECRET", "FISCAL_WEBHOOK_SECRET", "FISCAL_CLIENT_ID", "FISCAL_CLIENT_SECRET"];

async function projetoVercel(): Promise<string> {
  try {
    const p = await vc<{ id: string; name: string }>("GET", `/v9/projects/${encodeURIComponent(NOME)}`);
    ok(`Projeto Vercel existente: ${p.name}`);
    return p.id;
  } catch (e) {
    if (!String(e).includes("HTTP 404")) throw e;
  }
  const p = await vc<{ id: string; name: string }>("POST", "/v11/projects", { name: NOME, framework: "nextjs" });
  ok(`Projeto Vercel criado: ${p.name}`);
  return p.id;
}

async function enviarVariaveis(projeto: string) {
  for (const nome of [...PUBLICAS, ...SECRETAS]) {
    const valor = env[nome];
    if (!valor) continue;
    // upsert=true substitui o valor existente para os mesmos ambientes
    await vc("POST", `/v10/projects/${projeto}/env?upsert=true`, {
      key: nome,
      value: valor,
      type: SECRETAS.includes(nome) ? "sensitive" : "encrypted",
      target: ["production", "preview"],
    });
  }
  ok(`${[...PUBLICAS, ...SECRETAS].filter((n) => env[n]).length} variáveis de ambiente cadastradas`);
}

function publicarVercel(): string {
  const escopo = process.env.VERCEL_SCOPE ? ["--scope", process.env.VERCEL_SCOPE] : [];
  const vercel = (args: string[], mostrar = true) => cli("npx", ["--yes", `vercel@${VERSAO_VERCEL}`, ...args, ...escopo, `--token=${TOKEN_VC}`], {}, mostrar);
  vercel(["link", "--yes", "--project", NOME], false);
  info("Publicando em produção (o build roda na Vercel, ~3 minutos)...");
  const saida = vercel(["deploy", "--prod", "--yes"]);
  // Fora de um terminal interativo, a CLI responde em JSON; em terminal, imprime a URL na última linha
  let url: string | undefined;
  try {
    const json = JSON.parse(saida.slice(saida.indexOf("{"))) as { deployment?: { url?: string; readyState?: string } };
    if (json.deployment?.readyState && json.deployment.readyState !== "READY") erro(`A publicação terminou com estado ${json.deployment.readyState}.`);
    url = json.deployment?.url;
  } catch {
    url = saida.trim().split("\n").filter((l) => l.startsWith("https://")).pop();
  }
  if (!url) erro(`Não consegui ler o endereço da publicação:\n${saida}`);
  return url;
}

async function dominioProducao(projeto: string): Promise<string> {
  const { domains } = await vc<{ domains: { name: string; verified: boolean }[] }>("GET", `/v9/projects/${projeto}/domains`);
  const proprios = domains.filter((d) => d.verified && !d.name.endsWith(".vercel.app"));
  const padrao = domains.find((d) => d.name.endsWith(".vercel.app"));
  const escolhido = proprios[0] ?? padrao;
  if (!escolhido) erro("O projeto não tem domínio de produção. Veja Settings › Domains na Vercel.");
  return `https://${escolhido.name}`;
}

// ---------------------------------------------------------------------------
// 3. Verificação
// ---------------------------------------------------------------------------
async function verificar(url: string) {
  const login = await fetch(`${url}/login`, { signal: AbortSignal.timeout(60_000) });
  if (!login.ok) erro(`${url}/login respondeu HTTP ${login.status}.`);
  ok(`${url}/login responde (HTTP ${login.status})`);
  const negado = await fetch(`${url}/api/cron/fiscal-sync`, { signal: AbortSignal.timeout(60_000) });
  if (negado.status !== 401) erro(`A rotina agendada deveria recusar chamadas sem segredo (HTTP ${negado.status}).`);
  const cron = await fetch(`${url}/api/cron/fiscal-sync`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` }, signal: AbortSignal.timeout(120_000) });
  if (!cron.ok) erro(`A rotina de sincronização fiscal falhou (HTTP ${cron.status}): ${(await cron.text()).slice(0, 300)}`);
  ok("rotina de sincronização fiscal protegida e funcionando (conecta ao banco de produção)");
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nPublicação — projeto "${NOME}"\n`);
  env.APP_ENCRYPTION_KEY ||= randomBytes(32).toString("base64");
  env.CRON_SECRET ||= randomBytes(24).toString("hex");
  env.FISCAL_WEBHOOK_SECRET ||= randomBytes(24).toString("hex");
  env.FISCAL_PROVIDER ||= "acbr";
  env.FISCAL_CREDENCIAL ||= "sandbox";
  env.RESP_TECNICO_CONTATO ||= "Órion Automação Inteligente";

  info("Supabase");
  const ref = await projetoSupabase();
  env.SUPABASE_PROJECT_REF = ref;
  salvarEnv();
  await aguardarProjeto(ref);
  await aplicarMigracoes(ref);
  await chavesSupabase(ref);
  env.NEXT_PUBLIC_APP_URL ||= `https://${NOME}.vercel.app`;
  await configurarAuth(ref, env.NEXT_PUBLIC_APP_URL);
  ok("cadastro público de usuários desligado");
  salvarEnv();
  if (SO_BANCO) {
    console.log(`\n✔ Banco pronto: https://supabase.com/dashboard/project/${ref}\n  Variáveis em .env.producao.`);
    return;
  }

  info("Vercel");
  const projeto = await projetoVercel();
  await enviarVariaveis(projeto);
  const publicado = publicarVercel();
  ok(`publicado: ${publicado}`);

  const url = await dominioProducao(projeto);
  if (url !== env.NEXT_PUBLIC_APP_URL) {
    info(`Endereço definitivo é ${url} — atualizando e publicando de novo (os links do WhatsApp usam esse endereço)...`);
    env.NEXT_PUBLIC_APP_URL = url;
    salvarEnv();
    await enviarVariaveis(projeto);
    publicarVercel();
    await configurarAuth(ref, url);
  }

  info("Agendamento da sincronização fiscal (a cada 10 minutos, dentro do banco)");
  await sql(ref, `select public.configurar_sincronizacao_fiscal(${literal(url)}, ${literal(env.CRON_SECRET!)})`);
  ok("agendado (pg_cron + pg_net; segredo guardado no Vault)");

  info("Verificando o site publicado");
  await verificar(url);

  console.log(`
✔ Sistema no ar: ${url}
  Banco:  https://supabase.com/dashboard/project/${ref}
  Vercel: https://vercel.com/dashboard
  Segredos em .env.producao — guarde uma cópia num cofre de senhas.

  Próximo passo — cadastrar a primeira loja:
    npm run empresa:nova -- --env .env.producao --cnpj <CNPJ> --admin-nome "<Nome>" --admin-email <email>
`);
}

main().catch((e) => erro(e instanceof Error ? e.message : String(e)));
