/**
 * Seed de demonstração — `npm run db:seed` (rodado pelo `npm run setup`).
 * Usa a chave secreta do Supabase local. NÃO rode contra o banco de produção.
 */
import { createCipheriv, randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { areaTotal, calcularTotais, consumoPorArea, gerarComissoes, gerarParcelas, type FormaPagamento } from "../src/lib/dominio/calculos";
import { somarDias } from "../src/lib/dominio/datas";
import { completarCNPJ, completarCPF } from "../src/lib/dominio/documentos";
import { codificar } from "../src/lib/fiscal/mock";
import type { Database } from "../src/lib/supabase/database.types";
import {
  CLIENTES,
  CONTAS_PAGAR,
  EMPRESA_DEMO,
  EMPRESA_DEMO_2,
  LINHAS_PELICULA,
  PRODUTOS,
  SERVICOS,
  USUARIOS_DEMO,
} from "./seed-dados";
import { carregarAmbiente } from "./ambiente";

type SB = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------
carregarAmbiente();
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const CHAVE_SECRETA = process.env.SUPABASE_SECRET_KEY;
const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!CHAVE_SECRETA || !CHAVE_PUBLICA) {
  console.error("Defina SUPABASE_SECRET_KEY e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (rode `npm run setup`).");
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(URL_SB) && process.env.SEED_PERMITIR_REMOTO !== "1") {
  console.error(`Recusando rodar o seed em ${URL_SB}. Para um banco de DEMONSTRAÇÃO na nuvem, use SEED_PERMITIR_REMOTO=1.`);
  process.exit(1);
}

const admin = createClient<Database>(URL_SB, CHAVE_SECRETA, { auth: { persistSession: false, autoRefreshToken: false } });

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
let estadoAleatorio = 20261009;
function aleatorio(): number {
  // mulberry32 — determinístico, para o seed ser sempre igual
  estadoAleatorio = (estadoAleatorio + 0x6d2b79f5) | 0;
  let t = estadoAleatorio;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const escolher = <T>(lista: readonly T[]): T => lista[Math.floor(aleatorio() * lista.length)]!;
const centavos = (reais: number) => Math.round(reais * 100);

function ok<R extends { data: unknown; error: unknown }>(r: R, contexto: string): NonNullable<R["data"]> {
  if (r.error) {
    console.error(`✖ ${contexto}:`, r.error);
    process.exit(1);
  }
  return r.data as NonNullable<R["data"]>;
}

const HOJE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
/** Data/hora ISO N dias atrás, num horário comercial */
function diasAtras(dias: number, hora = 10): string {
  return `${somarDias(HOJE, -dias)}T${String(hora).padStart(2, "0")}:${String(Math.floor(aleatorio() * 60)).padStart(2, "0")}:00-03:00`;
}

function criptografar(texto: string): string | null {
  const chave = process.env.APP_ENCRYPTION_KEY ? Buffer.from(process.env.APP_ENCRYPTION_KEY, "base64") : null;
  if (!chave || chave.length !== 32) return null;
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chave, iv);
  const conteudo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return ["v1", iv.toString("base64"), cifra.getAuthTag().toString("base64"), conteudo.toString("base64")].join(".");
}

async function criarUsuario(empresaId: string, u: { nome: string; email: string; senha: string; papel: "admin" | "atendente" | "instalador" }) {
  const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: u.senha, email_confirm: true, user_metadata: { nome: u.nome } });
  if (error) {
    console.error(`✖ Usuário ${u.email}:`, error.message);
    process.exit(1);
  }
  ok(await admin.from("perfis").insert({ id: data.user.id, empresa_id: empresaId, nome: u.nome, email: u.email, papel: u.papel }), "perfil");
  return data.user.id;
}

async function entrar(email: string, senha: string): Promise<SB> {
  const cliente = createClient<Database>(URL_SB, CHAVE_PUBLICA!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await cliente.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return cliente;
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
async function main() {
  const cnpj = completarCNPJ(EMPRESA_DEMO.cnpj_base);
  const { data: existente } = await admin.from("empresas").select("id").eq("cnpj", cnpj).maybeSingle();
  if (existente) {
    console.log("ℹ Os dados de demonstração já existem. Para recriar do zero: npm run db:reset && npm run db:seed");
    return;
  }

  console.log("• Empresa e usuários");
  const { cnpj_base: _b, ...dadosEmpresa } = EMPRESA_DEMO;
  const empresa = ok(await admin.from("empresas").insert({ ...dadosEmpresa, cnpj }).select().single(), "empresa");
  const E = empresa.id;
  const usuarios: Record<string, string> = {};
  for (const u of USUARIOS_DEMO) usuarios[u.email] = await criarUsuario(E, u);
  const idAdmin = usuarios["admin@demo.orion.app"]!;
  const instaladores = [usuarios["instalador@demo.orion.app"]!, usuarios["instalador2@demo.orion.app"]!];

  ok(
    await admin
      .from("empresa_config_fiscal")
      .update({
        ambiente: "homologacao",
        nfse_proximo_numero: 1,
        nfse_aliquota_iss: 4,
        nfce_csc_id: 1,
        nfce_csc_cifrado: criptografar("DEMO-CSC-0000-0000-0000-0000-0001"),
        natureza_operacao: "Venda de mercadoria",
      })
      .eq("empresa_id", E),
    "config fiscal",
  );

  const categorias = ok(await admin.from("categorias_veiculo").select("id, nome").eq("empresa_id", E), "categorias");
  const idCategoria = Object.fromEntries(categorias.map((c) => [c.nome, c.id])) as Record<string, string>;

  console.log("• Produtos e estoque inicial");
  const produtos: Record<string, Database["public"]["Tables"]["produtos"]["Row"]> = {};
  const dataCompra = diasAtras(75, 9);
  const notaCompra = ok(
    await admin
      .from("notas_compra")
      .insert({
        empresa_id: E,
        chave: "43" + "2607" + "12345678000190" + "55" + "001" + "000045871" + "1" + "45871234" + "7",
        numero: "45871",
        serie: "1",
        fornecedor_cnpj: "12345678000190",
        fornecedor_nome: "Distribuidora Autopeças Sul LTDA",
        data_emissao: dataCompra,
        valor_total_centavos: 0,
        created_at: dataCompra,
      })
      .select()
      .single(),
    "nota de compra",
  );
  let totalCompra = 0;
  let serie = 1000;
  for (const p of PRODUTOS) {
    const { fiscal, ...resto } = p;
    const prod = ok(
      await admin
        .from("produtos")
        .insert({
          empresa_id: E,
          codigo: resto.codigo,
          nome: resto.nome,
          categoria: resto.categoria,
          marca: resto.marca ?? null,
          tipo_controle: resto.tipo_controle ?? "unidade",
          unidade: resto.unidade ?? (resto.tipo_controle === "metro" ? "M" : "UN"),
          exige_numero_serie: resto.exige_numero_serie ?? false,
          preco_venda_centavos: centavos(resto.preco),
          custo_centavos: centavos(resto.custo),
          estoque_minimo: resto.minimo,
          largura_rolo_m: resto.largura_rolo_m ?? null,
          codigo_barras: resto.codigo_barras ?? null,
          garantia_dias: resto.categoria === "alarme" ? 365 : resto.categoria === "lampada" ? 90 : null,
          fiscal_validado: false,
          ...fiscal,
          created_by: idAdmin,
        })
        .select()
        .single(),
      `produto ${p.nome}`,
    );
    produtos[p.chave] = prod;

    const entradas = p.rolos ?? (p.estoque > 0 ? [p.estoque] : []);
    for (const [i, qtd] of entradas.entries()) {
      let roloId: string | null = null;
      if (prod.tipo_controle === "metro") {
        const rolo = ok(
          await admin
            .from("rolos_pelicula")
            .insert({ empresa_id: E, produto_id: prod.id, identificacao: `${p.codigo}-R${i + 1}`, metragem_inicial: qtd, saldo_metros: 0, nota_compra_id: notaCompra.id, created_at: dataCompra })
            .select()
            .single(),
          "rolo",
        );
        roloId = rolo.id;
      }
      ok(
        await admin.from("movimentacoes_estoque").insert({
          empresa_id: E,
          produto_id: prod.id,
          rolo_id: roloId,
          tipo: "entrada",
          quantidade: qtd,
          custo_unitario_centavos: prod.custo_centavos,
          motivo: `NF-e de compra nº ${notaCompra.numero}`,
          nota_compra_id: notaCompra.id,
          created_at: dataCompra,
          created_by: idAdmin,
        }),
        "entrada de estoque",
      );
      totalCompra += Math.round(prod.custo_centavos * qtd);
      if (prod.exige_numero_serie) {
        const series = Array.from({ length: qtd }, () => `${p.codigo.slice(4)}-${++serie}`);
        ok(await admin.from("numeros_serie").insert(series.map((numero) => ({ empresa_id: E, produto_id: prod.id, numero, created_at: dataCompra }))), "séries");
      }
    }
    ok(
      await admin.from("produto_codigos_fornecedor").insert({ empresa_id: E, produto_id: prod.id, fornecedor_cnpj: "12345678000190", codigo_fornecedor: `F-${p.codigo}` }),
      "código fornecedor",
    );
  }
  await admin.from("notas_compra").update({ valor_total_centavos: totalCompra }).eq("id", notaCompra.id);

  console.log("• Serviços, linhas de película e tabela de preços");
  const servicos: Record<string, Database["public"]["Tables"]["servicos"]["Row"]> = {};
  for (const s of SERVICOS) {
    const serv = ok(
      await admin
        .from("servicos")
        .insert({
          empresa_id: E,
          codigo: s.codigo,
          nome: s.nome,
          categoria: s.categoria,
          tipo_preco: s.tipo_preco,
          preco_centavos: centavos(s.preco),
          produto_consumo_id: s.produto_consumo ? produtos[s.produto_consumo]!.id : null,
          comissao_tipo: s.comissao.tipo,
          comissao_percentual: s.comissao.tipo === "percentual" ? s.comissao.valor : 0,
          comissao_fixo_centavos: s.comissao.tipo === "fixo" ? centavos(s.comissao.valor) : 0,
          tempo_estimado_min: s.tempo ?? null,
          garantia_dias: s.garantia ?? null,
          fiscal_validado: false,
          ...s.fiscal,
          created_by: idAdmin,
        })
        .select()
        .single(),
      `serviço ${s.nome}`,
    );
    servicos[s.chave] = serv;
    if (s.precos_categoria) {
      ok(
        await admin.from("servico_precos_categoria").insert(
          Object.entries(s.precos_categoria).map(([cat, preco]) => ({
            empresa_id: E,
            servico_id: serv.id,
            categoria_id: idCategoria[cat]!,
            preco_centavos: centavos(preco!),
          })),
        ),
        "preços por categoria",
      );
    }
  }

  const linhas: { id: string; nome: string; produto_id: string; tabela: Record<string, { preco: number; consumo: number }> }[] = [];
  for (const [ordem, l] of LINHAS_PELICULA.entries()) {
    const linha = ok(
      await admin
        .from("linhas_pelicula")
        .insert({ empresa_id: E, nome: l.nome, marca: l.marca, descricao: l.descricao, produto_id: produtos[l.produto]!.id, servico_id: servicos.pel_auto!.id, ordem })
        .select()
        .single(),
      "linha de película",
    );
    const tabela: Record<string, { preco: number; consumo: number }> = {};
    ok(
      await admin.from("tabela_precos_pelicula").insert(
        Object.entries(l.precos).map(([cat, [preco, consumo]]) => {
          tabela[idCategoria[cat]!] = { preco: centavos(preco), consumo };
          return { empresa_id: E, linha_id: linha.id, categoria_id: idCategoria[cat]!, preco_centavos: centavos(preco), consumo_metros: consumo };
        }),
      ),
      "tabela de película",
    );
    linhas.push({ id: linha.id, nome: l.nome, produto_id: produtos[l.produto]!.id, tabela });
  }

  console.log("• Clientes e veículos");
  const clientes: { id: string; nome: string; tipo: "PF" | "PJ"; veiculos: { id: string; categoria_id: string; descricao: string }[] }[] = [];
  const docsUsados = new Set<string>();
  for (const [i, c] of CLIENTES.entries()) {
    let base = c.doc_base;
    let doc = c.tipo === "PF" ? completarCPF(base) : completarCNPJ(base);
    while (docsUsados.has(doc)) {
      base = String(Number(base) + 7);
      doc = c.tipo === "PF" ? completarCPF(base.padStart(9, "0")) : completarCNPJ(base.padStart(12, "0"));
    }
    docsUsados.add(doc);
    const criadoEm = diasAtras(120 - i * 3, 9);
    const cli = ok(
      await admin
        .from("clientes")
        .insert({
          empresa_id: E,
          tipo_pessoa: c.tipo,
          nome: c.nome,
          nome_fantasia: c.fantasia ?? null,
          cpf_cnpj: doc,
          inscricao_estadual: c.ie ?? null,
          email: c.email ?? null,
          telefone: c.telefone,
          whatsapp: c.telefone.length === 11 ? c.telefone : null,
          cep: c.cep,
          logradouro: c.logradouro,
          numero: c.numero,
          bairro: c.bairro,
          cidade: c.cidade,
          uf: "RS",
          codigo_municipio: c.ibge,
          created_at: criadoEm,
          created_by: escolher([idAdmin, usuarios["atendente@demo.orion.app"]!]),
        })
        .select()
        .single(),
      `cliente ${c.nome}`,
    );
    const veiculos = [];
    for (const v of c.veiculos) {
      const vei = ok(
        await admin
          .from("veiculos")
          .insert({
            empresa_id: E,
            cliente_id: cli.id,
            placa: v.placa,
            marca: v.marca,
            modelo: v.modelo,
            ano_fabricacao: v.ano,
            ano_modelo: v.ano,
            cor: v.cor,
            categoria_id: idCategoria[v.categoria]!,
            created_at: criadoEm,
          })
          .select()
          .single(),
        `veículo ${v.placa}`,
      );
      veiculos.push({ id: vei.id, categoria_id: vei.categoria_id!, descricao: `${v.marca} ${v.modelo}` });
    }
    clientes.push({ id: cli.id, nome: cli.nome, tipo: c.tipo, veiculos });
  }

  // -------------------------------------------------------------------------
  // Orçamentos e OS (como o usuário admin, para passar pelas regras do banco)
  // -------------------------------------------------------------------------
  console.log("• Orçamentos e ordens de serviço");
  const sb = await entrar("admin@demo.orion.app", "Demo@2026");

  type ItemNovo = Database["public"]["Tables"]["orcamento_itens"]["Insert"] & { regra?: Database["public"]["Tables"]["servicos"]["Row"] };
  const precoCat = async (servicoId: string, categoriaId: string, padrao: number) => {
    const { data } = await admin.from("servico_precos_categoria").select("preco_centavos").eq("servico_id", servicoId).eq("categoria_id", categoriaId).maybeSingle();
    return data?.preco_centavos ?? padrao;
  };

  async function montarItens(cliente: (typeof clientes)[number], perfil: number): Promise<{ itens: ItemNovo[]; veiculo: (typeof cliente.veiculos)[number] | null }> {
    const veiculo = cliente.veiculos.length ? escolher(cliente.veiculos) : null;
    const itens: ItemNovo[] = [];
    const servico = (chave: string, preco: number, extra: Partial<ItemNovo> = {}) => {
      const s = servicos[chave]!;
      itens.push({ tipo: "servico", servico_id: s.id, descricao: s.nome, quantidade: 1, unidade: "UN", preco_unitario_centavos: preco, total_centavos: preco, regra: s, ...extra } as ItemNovo);
    };
    const produto = (chave: string, qtd = 1, extra: Partial<ItemNovo> = {}) => {
      const p = produtos[chave]!;
      itens.push({ tipo: "produto", produto_id: p.id, descricao: p.nome, quantidade: qtd, unidade: p.unidade, preco_unitario_centavos: p.preco_venda_centavos, total_centavos: Math.round(p.preco_venda_centavos * qtd), ...extra } as ItemNovo);
    };

    if (!veiculo) {
      // Película residencial para PJ sem veículo
      const medidas = [
        { descricao: "Janela sala", largura_m: 1.6, altura_m: 1.2, quantidade: 4 },
        { descricao: "Porta de vidro", largura_m: 0.9, altura_m: 2.1, quantidade: 2 },
        { descricao: "Basculante banheiro", largura_m: 0.6, altura_m: 0.45, quantidade: 3 },
      ];
      const area = areaTotal(medidas);
      const s = servicos.pel_res!;
      const consumo = consumoPorArea(area, 1.52, Number(s.perda_percentual));
      itens.push({ tipo: "servico", servico_id: s.id, descricao: s.nome, quantidade: area, unidade: "M2", preco_unitario_centavos: s.preco_centavos, total_centavos: Math.round(s.preco_centavos * area), medidas, area_m2: area, consumo_metros: consumo, regra: s } as unknown as ItemNovo);
      return { itens, veiculo };
    }

    switch (perfil % 6) {
      case 0: {
        const linha = escolher(linhas);
        const t = linha.tabela[veiculo.categoria_id]!;
        servico("pel_auto", t.preco, { linha_pelicula_id: linha.id, descricao: `Película ${linha.nome} — ${veiculo.descricao}`, consumo_metros: t.consumo });
        if (aleatorio() > 0.5) servico("pel_parabrisa", await precoCat(servicos.pel_parabrisa!.id, veiculo.categoria_id, 12000));
        break;
      }
      case 1: {
        produto(escolher(["alarme_px", "alarme_ex"]));
        servico("inst_alarme", servicos.inst_alarme!.preco_centavos);
        break;
      }
      case 2: {
        produto(escolher(["led_h4", "led_h7", "led_h11", "sb_h4"]));
        servico("troca_lampada", servicos.troca_lampada!.preco_centavos);
        produto("t10");
        break;
      }
      case 3: {
        servico("higienizacao", await precoCat(servicos.higienizacao!.id, veiculo.categoria_id, 14000));
        produto("higienizador");
        if (aleatorio() > 0.4) {
          servico("troca_filtro", servicos.troca_filtro!.preco_centavos);
          produto("filtro");
        }
        if (aleatorio() > 0.5) {
          servico("carga_gas", await precoCat(servicos.carga_gas!.id, veiculo.categoria_id, 15000));
          produto("gas", 0.6);
        }
        break;
      }
      case 4: {
        const linha = linhas.find((l) => l.nome === "Nano cerâmica")!;
        const t = linha.tabela[veiculo.categoria_id]!;
        servico("pel_auto", t.preco, { linha_pelicula_id: linha.id, descricao: `Película Nano cerâmica — ${veiculo.descricao}`, consumo_metros: t.consumo });
        produto("sensor");
        servico("inst_sensor", servicos.inst_sensor!.preco_centavos);
        break;
      }
      default: {
        produto("multimidia");
        servico("inst_som", servicos.inst_som!.preco_centavos);
        produto("camera");
        servico("inst_camera", servicos.inst_camera!.preco_centavos);
      }
    }
    return { itens, veiculo };
  }

  const planos = [
    ...Array(14).fill("os"),
    ...Array(4).fill("rascunho"),
    ...Array(4).fill("enviado"),
    ...Array(3).fill("recusado"),
    ...Array(2).fill("expirado"),
  ] as const;

  const osCriadas: { id: string; numero: number; total: number; diasAtras: number; clienteTipo: "PF" | "PJ"; destino: string }[] = [];
  const destinosOS = ["entregue", "entregue", "entregue", "entregue", "concluida", "concluida", "concluida", "concluida", "concluida", "em_execucao", "em_execucao", "aguardando_peca", "aberta", "cancelada"];
  let idxOS = 0;

  for (const [i, plano] of planos.entries()) {
    const cliente = clientes[(i * 7) % clientes.length]!;
    const { itens, veiculo } = await montarItens(cliente, i);
    const descontoTotal = aleatorio() > 0.7 ? centavos(escolher([20, 30, 50])) : 0;
    const totais = calcularTotais(
      itens.map((it) => ({ quantidade: Number(it.quantidade), preco_unitario_centavos: it.preco_unitario_centavos!, desconto_centavos: it.desconto_centavos ?? 0 })),
      descontoTotal,
    );
    const dias = plano === "os" ? 55 - idxOS * 4 : plano === "expirado" ? 40 + i : plano === "recusado" ? 20 + i : Math.max(0, 6 - (i % 7));
    const criadoEm = diasAtras(dias, 9);
    const numero = ok(await sb.rpc("proximo_numero", { p_empresa: E, p_chave: "orcamento" }), "número orçamento");
    const status = plano === "os" ? "enviado" : plano;
    const orc = ok(
      await sb
        .from("orcamentos")
        .insert({
          numero,
          cliente_id: cliente.id,
          veiculo_id: veiculo?.id ?? null,
          status,
          validade: somarDias(criadoEm.slice(0, 10), 7),
          observacoes: escolher([null, "Cliente pediu agendamento para sábado.", "Garantia de 5 anos na película.", "Pagamento facilitado em até 3x no cartão."]),
          ...totais,
          enviado_em: status !== "rascunho" ? criadoEm : null,
          recusado_em: status === "recusado" ? diasAtras(dias - 2) : null,
          motivo_recusa: status === "recusado" ? escolher(["Achou caro", "Fechou com outra loja", "Vai deixar para o próximo mês"]) : null,
          created_at: criadoEm,
        })
        .select()
        .single(),
      "orçamento",
    );
    ok(
      await sb.from("orcamento_itens").insert(
        itens.map(({ regra: _r, ...it }, ordem) => ({ ...it, orcamento_id: orc.id, ordem, created_at: criadoEm })),
        { defaultToNull: false },
      ),
      "itens do orçamento",
    );

    if (plano !== "os") continue;

    const destino = destinosOS[idxOS]!;
    const instalador = instaladores[idxOS % 2]!;
    const osId = ok(await sb.rpc("gerar_os_de_orcamento", { p_orcamento: orc.id, p_instalador: instalador }), "gerar OS");
    const forma: FormaPagamento = escolher(["pix", "pix", "dinheiro", "debito", "credito_vista", "credito_parcelado", "credito_parcelado", "boleto"]);
    const parcelas = forma === "credito_parcelado" ? escolher([2, 3, 4]) : forma === "boleto" ? 2 : 1;
    await sb.from("ordens_servico").update({ forma_pagamento: forma, parcelas }).eq("id", osId);
    await admin.from("ordens_servico").update({ created_at: criadoEm }).eq("id", osId);
    await admin.from("os_itens").update({ created_at: criadoEm }).eq("os_id", osId);
    await admin.from("os_historico").update({ created_at: criadoEm }).eq("os_id", osId).eq("status_novo", "aberta");
    const os = ok(await sb.from("ordens_servico").select("numero, total_centavos").eq("id", osId).single(), "OS");
    osCriadas.push({ id: osId, numero: os.numero, total: os.total_centavos, diasAtras: dias, clienteTipo: cliente.tipo, destino });

    if (["concluida", "entregue"].includes(destino)) {
      // números de série dos alarmes
      const { data: itensOS } = await sb.from("os_itens").select("*").eq("os_id", osId).order("ordem");
      for (const it of itensOS ?? []) {
        if (it.produto_id && produtos[Object.keys(produtos).find((k) => produtos[k]!.id === it.produto_id)!]!.exige_numero_serie) {
          const { data: serieLivre } = await admin.from("numeros_serie").select("numero").eq("produto_id", it.produto_id).eq("status", "disponivel").limit(1).single();
          await sb.from("os_itens").update({ numeros_serie: [serieLivre!.numero] }).eq("id", it.id);
        }
      }
      const comissoes = gerarComissoes(
        (itensOS ?? []).map((it) => {
          const regra = Object.values(servicos).find((s) => s.id === it.servico_id);
          return {
            id: it.id,
            tipo: it.tipo,
            quantidade: Number(it.quantidade),
            preco_unitario_centavos: it.preco_unitario_centavos,
            desconto_centavos: it.desconto_centavos,
            instalador_id: it.instalador_id,
            regra: regra ? { comissao_tipo: regra.comissao_tipo, comissao_percentual: Number(regra.comissao_percentual), comissao_fixo_centavos: regra.comissao_fixo_centavos } : null,
            cobrado_por_area: regra?.tipo_preco === "m2",
          };
        }),
        totais.desconto_total_centavos,
        instalador,
      );
      const dataConclusao = somarDias(HOJE, -Math.max(0, dias - 1));
      const parcelasGeradas = gerarParcelas(os.total_centavos, forma, parcelas, dataConclusao);
      ok(await sb.rpc("concluir_os", { p_os: osId, p_parcelas: parcelasGeradas as never, p_comissoes: comissoes as never }), `concluir OS ${os.numero}`);
      const concluidaEm = diasAtras(Math.max(0, dias - 1), 16);
      await admin.from("ordens_servico").update({ concluida_em: concluidaEm, iniciada_em: diasAtras(Math.max(0, dias - 1), 9) }).eq("id", osId);
      await admin.from("comissoes").update({ competencia: concluidaEm.slice(0, 10) }).eq("os_id", osId);
      await admin.from("os_historico").update({ created_at: concluidaEm }).eq("os_id", osId).eq("status_novo", "concluida");
      if (destino === "entregue") {
        ok(await sb.rpc("alterar_status_os", { p_os: osId, p_status: "entregue" }), "entregar OS");
        await admin.from("ordens_servico").update({ entregue_em: diasAtras(Math.max(0, dias - 2), 17) }).eq("id", osId);
      }
      // Recebimentos: à vista já pagos; parcelas vencidas pagas, futuras em aberto (uma vencida em aberto)
      const { data: titulos } = await admin.from("contas_receber").select("*").eq("os_id", osId).order("parcela");
      for (const t of titulos ?? []) {
        const venceu = t.vencimento <= HOJE;
        const deixarVencido = idxOS === 7 && t.parcela === 1;
        if (venceu && !deixarVencido && dias > 1) {
          await admin
            .from("contas_receber")
            .update({ status: "pago", pago_em: `${t.vencimento}T15:00:00-03:00`, valor_pago_centavos: t.valor_centavos, forma_pagamento_baixa: t.forma_pagamento ?? "pix" })
            .eq("id", t.id);
        }
      }
    } else if (destino === "em_execucao" || destino === "aguardando_peca") {
      ok(await sb.rpc("alterar_status_os", { p_os: osId, p_status: destino, p_observacao: destino === "aguardando_peca" ? "Aguardando chegada da central multimídia" : undefined }), "status OS");
    } else if (destino === "cancelada") {
      ok(await sb.rpc("alterar_status_os", { p_os: osId, p_status: "cancelada", p_observacao: "Cliente desistiu do serviço" }), "cancelar OS");
    }
    idxOS++;
  }

  console.log("• Notas fiscais (simuladas)");
  const config = ok(await admin.from("empresa_config_fiscal").select("*").eq("empresa_id", E).single(), "config");
  let numNfse = config.nfse_proximo_numero;
  let numNfce = config.nfce_proximo_numero;
  for (const [i, os] of osCriadas.filter((o) => ["concluida", "entregue"].includes(o.destino)).slice(0, 6).entries()) {
    const rejeitar = i === 5;
    const tipo = i % 3 === 2 ? "nfce" : "nfse";
    const numero = tipo === "nfse" ? numNfse++ : numNfce++;
    const ts = new Date(diasAtras(Math.max(0, os.diasAtras - 1), 17)).getTime() - (rejeitar ? 0 : 10_000);
    const estado = { t: tipo, ts, n: numero, s: tipo === "nfse" ? config.nfse_serie : String(config.nfce_serie), cnpj, uf: "RS", amb: "homologacao" as const, v: os.total, ...(rejeitar ? { rej: { c: "778", m: "Rejeicao: Informado NCM inexistente" } } : {}) };
    const provedorId = codificar(estado as never);
    const { data: osDados } = await admin.from("ordens_servico").select("cliente_id").eq("id", os.id).single();
    ok(
      await admin.from("notas_fiscais").insert({
        empresa_id: E,
        os_id: os.id,
        cliente_id: osDados!.cliente_id,
        tipo,
        status: rejeitar ? "rejeitada" : "autorizada",
        ambiente: "homologacao",
        provedor: "mock",
        provedor_id: provedorId,
        referencia: `os-${os.numero}-${tipo}-1`,
        nfse_provedor: tipo === "nfse" ? "nacional" : null,
        numero: rejeitar ? null : String(numero),
        serie: estado.s,
        codigo_verificacao: tipo === "nfse" && !rejeitar ? provedorId.slice(-8).toUpperCase() : null,
        data_emissao: new Date(ts).toISOString(),
        valor_total_centavos: os.total,
        codigo_rejeicao: rejeitar ? "778" : null,
        motivo_rejeicao: rejeitar ? "Rejeicao: Informado NCM inexistente" : null,
        motivo_amigavel: rejeitar ? "O NCM de algum produto é inválido ou não existe. Corrija o NCM no cadastro do produto (peça ao contador) e reenvie." : null,
        mensagens: rejeitar ? [{ codigo: "778", descricao: "Rejeicao: Informado NCM inexistente" }] : [],
        tentativas: 1,
        created_at: new Date(ts).toISOString(),
        created_by: idAdmin,
      }),
      "nota",
    );
  }
  await admin.from("empresa_config_fiscal").update({ nfse_proximo_numero: numNfse, nfce_proximo_numero: numNfce }).eq("empresa_id", E);

  console.log("• Financeiro (contas a pagar e caixa de ontem)");
  const catFin = ok(await admin.from("categorias_financeiras").select("id, nome").eq("empresa_id", E), "categorias financeiras");
  for (const c of CONTAS_PAGAR) {
    const venc = somarDias(HOJE, c.dias);
    const pago = c.dias < 0 && c.descricao.includes("Água");
    ok(
      await admin.from("contas_pagar").insert({
        empresa_id: E,
        categoria_id: catFin.find((x) => x.nome === c.categoria)?.id ?? null,
        fornecedor: c.fornecedor,
        descricao: c.descricao,
        valor_centavos: centavos(c.valor),
        vencimento: venc,
        status: pago ? "pago" : "aberto",
        pago_em: pago ? `${venc}T11:00:00-03:00` : null,
        valor_pago_centavos: pago ? centavos(c.valor) : null,
        forma_pagamento: pago ? "pix" : null,
        created_by: idAdmin,
      }),
      "conta a pagar",
    );
  }
  const ontem = somarDias(HOJE, -1);
  const caixa = ok(
    await admin
      .from("caixas")
      .insert({
        empresa_id: E,
        status: "fechado",
        aberto_em: `${ontem}T08:05:00-03:00`,
        aberto_por: usuarios["atendente@demo.orion.app"],
        valor_abertura_centavos: 20000,
        fechado_em: `${ontem}T18:10:00-03:00`,
        fechado_por: usuarios["atendente@demo.orion.app"],
        conferencia: { dinheiro: { esperado: 35000, informado: 35000, diferenca: 0 }, pix: { esperado: 48990, informado: 48990, diferenca: 0 } },
        diferenca_centavos: 0,
        created_at: `${ontem}T08:05:00-03:00`,
      })
      .select()
      .single(),
    "caixa",
  );
  ok(
    await admin.from("caixa_movimentos").insert([
      { empresa_id: E, caixa_id: caixa.id, tipo: "abertura", forma_pagamento: "dinheiro", valor_centavos: 20000, descricao: "Fundo de troco", created_at: `${ontem}T08:05:00-03:00` },
      { empresa_id: E, caixa_id: caixa.id, tipo: "recebimento", forma_pagamento: "dinheiro", valor_centavos: 25000, descricao: "Venda balcão — lâmpadas", created_at: `${ontem}T10:30:00-03:00` },
      { empresa_id: E, caixa_id: caixa.id, tipo: "recebimento", forma_pagamento: "pix", valor_centavos: 48990, descricao: "Higienização + filtro", created_at: `${ontem}T14:12:00-03:00` },
      { empresa_id: E, caixa_id: caixa.id, tipo: "sangria", forma_pagamento: "dinheiro", valor_centavos: 10000, descricao: "Depósito no banco", created_at: `${ontem}T17:40:00-03:00` },
    ]),
    "movimentos do caixa",
  );

  console.log("• Segunda empresa (demonstração do isolamento)");
  const empresa2 = ok(
    await admin
      .from("empresas")
      .insert({ razao_social: EMPRESA_DEMO_2.razao_social, nome_fantasia: EMPRESA_DEMO_2.nome_fantasia, cnpj: completarCNPJ(EMPRESA_DEMO_2.cnpj_base), cidade: EMPRESA_DEMO_2.cidade, uf: EMPRESA_DEMO_2.uf, codigo_municipio: EMPRESA_DEMO_2.codigo_municipio })
      .select()
      .single(),
    "empresa 2",
  );
  await criarUsuario(empresa2.id, { ...EMPRESA_DEMO_2.admin, papel: "admin" });
  ok(
    await admin.from("clientes").insert([
      { empresa_id: empresa2.id, nome: "Cliente exclusivo da Serra Insulfilm", telefone: "54999990001", cidade: "Caxias do Sul", uf: "RS" },
      { empresa_id: empresa2.id, nome: "Outro cliente da Serra", telefone: "54999990002", cidade: "Farroupilha", uf: "RS" },
    ]),
    "clientes empresa 2",
  );

  console.log(`\n✔ Seed concluído: ${PRODUTOS.length} produtos, ${SERVICOS.length} serviços, ${clientes.length} clientes, ${planos.length} orçamentos, ${osCriadas.length} OS.`);
  console.log("  Logins em docs/ACESSOS_DEMO.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
