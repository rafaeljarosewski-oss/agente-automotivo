/**
 * Cadastra uma nova loja cliente (empresa + usuário administrador) — `npm run empresa:nova`.
 *
 * Exemplo:
 *   npm run empresa:nova -- --cnpj 12.345.678/0001-95 --admin-nome "Maria Souza" --admin-email maria@loja.com.br
 *
 * Opções:
 *   --cnpj          CNPJ da loja (numérico ou alfanumérico). Os dados são buscados na BrasilAPI.
 *   --admin-nome    Nome do administrador da loja.
 *   --admin-email   E-mail de login do administrador.
 *   --razao         Razão social (só se a consulta do CNPJ falhar).
 *   --senha         Senha inicial. Se omitida, uma senha temporária é gerada e exibida.
 *   --env           Arquivo de variáveis (padrão: .env.local). Para produção, crie um .env.producao
 *                   com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY do projeto na nuvem.
 */
import { randomInt } from "node:crypto";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

import { normalizarDocumento, validarCNPJ, formatarCNPJ } from "../src/lib/dominio/documentos";
import { consultarCNPJ } from "../src/lib/servidor/consultas-externas";
import type { Database } from "../src/lib/supabase/database.types";
import { carregarAmbiente } from "./ambiente";

const { values: opcoes } = parseArgs({
  options: {
    cnpj: { type: "string" },
    "admin-nome": { type: "string" },
    "admin-email": { type: "string" },
    razao: { type: "string" },
    senha: { type: "string" },
    env: { type: "string", default: ".env.local" },
  },
});

function sair(mensagem: string): never {
  console.error(`✖ ${mensagem}`);
  process.exit(1);
}

/** Senha temporária legível (sem caracteres ambíguos), com maiúscula, minúscula, número e símbolo */
function gerarSenha(): string {
  const grupos = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "@#%*!"];
  const todos = grupos.join("");
  const chars = grupos.map((g) => g[randomInt(g.length)]!);
  while (chars.length < 12) chars.push(todos[randomInt(todos.length)]!);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

async function main() {
  carregarAmbiente(opcoes.env);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !chave) sair(`Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY (em ${opcoes.env} ou no terminal).`);

  const cnpj = normalizarDocumento(opcoes.cnpj);
  if (!validarCNPJ(cnpj)) sair("Informe um CNPJ válido em --cnpj.");
  const nomeAdmin = opcoes["admin-nome"]?.trim();
  const emailAdmin = opcoes["admin-email"]?.trim().toLowerCase();
  if (!nomeAdmin) sair('Informe o nome do administrador em --admin-nome "Nome Sobrenome".');
  if (!emailAdmin || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAdmin)) sair("Informe um e-mail válido em --admin-email.");
  const senha = opcoes.senha ?? gerarSenha();
  if (senha.length < 8) sair("A senha deve ter pelo menos 8 caracteres.");

  const admin = createClient<Database>(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`→ Banco: ${url}`);

  const { data: existente } = await admin.from("empresas").select("id, razao_social").eq("cnpj", cnpj).maybeSingle();
  if (existente) sair(`Já existe uma empresa com este CNPJ: ${existente.razao_social}.`);

  console.log("→ Consultando o CNPJ na BrasilAPI...");
  const dados = await consultarCNPJ(cnpj);
  const razao = dados?.razao_social || opcoes.razao?.trim();
  if (!razao) sair("Não foi possível consultar o CNPJ. Informe a razão social em --razao e complete o cadastro depois, em Configurações › Empresa.");

  const { data: empresa, error: erroEmpresa } = await admin
    .from("empresas")
    .insert({
      cnpj,
      razao_social: razao,
      nome_fantasia: dados?.nome_fantasia || null,
      email: dados?.email ?? emailAdmin,
      telefone: dados?.telefone ?? null,
      cnae: dados?.cnae ?? null,
      regime_tributario: dados?.mei ? "mei" : dados?.simples === false ? "normal" : "simples_nacional",
      ...(dados?.endereco
        ? {
            cep: dados.endereco.cep || null,
            logradouro: dados.endereco.logradouro || null,
            numero: dados.endereco.numero || null,
            complemento: dados.endereco.complemento || null,
            bairro: dados.endereco.bairro || null,
            cidade: dados.endereco.cidade || null,
            uf: dados.endereco.uf || null,
            codigo_municipio: dados.endereco.codigo_municipio,
          }
        : {}),
    })
    .select()
    .single();
  if (erroEmpresa || !empresa) sair(`Erro ao criar a empresa: ${erroEmpresa?.message}`);

  const desfazer = async () => {
    await admin.from("empresas").delete().eq("id", empresa.id);
  };

  const { data: usuario, error: erroUsuario } = await admin.auth.admin.createUser({
    email: emailAdmin,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: nomeAdmin },
  });
  if (erroUsuario || !usuario.user) {
    await desfazer();
    sair(
      erroUsuario?.message?.toLowerCase().includes("already")
        ? `O e-mail ${emailAdmin} já tem login no sistema. Cada usuário pertence a uma única loja: use outro e-mail.`
        : `Erro ao criar o usuário: ${erroUsuario?.message}`,
    );
  }

  const { error: erroPerfil } = await admin.from("perfis").insert({ id: usuario.user.id, empresa_id: empresa.id, nome: nomeAdmin, email: emailAdmin, papel: "admin" });
  if (erroPerfil) {
    await admin.auth.admin.deleteUser(usuario.user.id);
    await desfazer();
    sair(`Erro ao criar o perfil: ${erroPerfil.message}`);
  }

  const app = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  console.log(`
✔ Loja cadastrada: ${empresa.nome_fantasia || empresa.razao_social} (CNPJ ${formatarCNPJ(cnpj)})
  ${dados ? "Dados preenchidos pela consulta do CNPJ — confira em Configurações › Empresa." : "Consulta do CNPJ indisponível: complete endereço e regime em Configurações › Empresa."}

  Acesso do administrador
    Endereço: ${app}/login
    E-mail:   ${emailAdmin}
    Senha:    ${senha}${opcoes.senha ? "" : "   (temporária — peça para trocar em Minha conta no primeiro acesso)"}

  Próximos passos da loja (ver README, seção "Cadastrar uma nova loja"):
    1. Conferir os dados da empresa e enviar o logotipo.
    2. Configurações › Fiscal: enviar o certificado A1, CSC da NFC-e, séries e numeração.
    3. Cadastrar usuários (atendentes e instaladores), produtos, serviços e tabela de películas.
    4. Validar NCM/CFOP/CSOSN e códigos de serviço com o contador e emitir uma nota de teste em homologação.
`);
}

main().catch((e) => sair(e instanceof Error ? e.message : String(e)));
