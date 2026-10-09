import "server-only";

import { liquidoPorItem } from "@/lib/dominio/calculos";
import { normalizarDocumento, somenteDigitos } from "@/lib/dominio/documentos";
import { traduzirErro } from "@/lib/servidor/erros";
import { criarClienteAdmin, type ClienteAdmin } from "@/lib/supabase/admin";
import type { AtualizaLinha, Tabela, TipoNota } from "@/lib/supabase/tipos";
import { obterProvedorFiscal } from "./index";
import { emitenteDaEmpresa } from "./dados";
import { codigoTributacaoNacional, totaisIbsCbs, validarPedido } from "./mapeamento";
import { traduzirRejeicao } from "./rejeicoes";
import { ErroFiscal, type DestinatarioFiscal, type FormaPagamentoFiscal, type ItemFiscal, type PedidoEmissao, type RespostaDocumento } from "./tipos";

type OSCompleta = Tabela<"ordens_servico"> & {
  clientes: Tabela<"clientes"> | null;
  veiculos: { placa: string } | null;
  os_itens: (Tabela<"os_itens"> & { produtos: Tabela<"produtos"> | null; servicos: Tabela<"servicos"> | null })[];
};

export interface NotaPlanejada {
  tipo: TipoNota;
  descricao: string;
  itens: { os_item_id: string; descricao: string; total_centavos: number }[];
  total_centavos: number;
}

/** Prazo legal de cancelamento (em horas) por tipo de documento; NFS-e depende do município (a API valida) */
export const PRAZO_CANCELAMENTO_HORAS: Record<TipoNota, number | null> = { nfe: 24, nfce: 0.5, nfse: null };

const STATUS_ATIVOS = ["processando", "autorizada"] as const;

async function carregarOS(admin: ClienteAdmin, empresaId: string, osId: string): Promise<OSCompleta | null> {
  const { data } = await admin
    .from("ordens_servico")
    .select("*, clientes(*), veiculos(placa), os_itens(*, produtos(*), servicos(*))")
    .eq("id", osId)
    .eq("empresa_id", empresaId)
    .is("deleted_at", null)
    .maybeSingle();
  return data as OSCompleta | null;
}

async function itensJaFaturados(admin: ClienteAdmin, osId: string): Promise<Set<string>> {
  const { data } = await admin.from("notas_fiscais").select("id, status, nota_itens(os_item_id)").eq("os_id", osId).in("status", [...STATUS_ATIVOS]);
  return new Set((data ?? []).flatMap((n) => n.nota_itens.map((i) => i.os_item_id).filter(Boolean) as string[]));
}

/** Decide quais notas emitir para a OS: NFS-e por código de serviço; produtos em NFC-e (PF) ou NF-e (PJ / escolha) */
export async function planejarNotas(empresaId: string, osId: string, tipoProdutos?: "nfce" | "nfe"): Promise<NotaPlanejada[]> {
  const admin = criarClienteAdmin();
  const os = await carregarOS(admin, empresaId, osId);
  if (!os) return [];
  const faturados = await itensJaFaturados(admin, osId);
  const liquidos = liquidoPorItem(
    os.os_itens.map((i) => ({ quantidade: Number(i.quantidade), preco_unitario_centavos: i.preco_unitario_centavos, desconto_centavos: i.desconto_centavos })),
    os.desconto_total_centavos,
  );
  const pendentes = os.os_itens.map((i, idx) => ({ item: i, liquido: liquidos[idx] ?? 0 })).filter(({ item, liquido }) => !faturados.has(item.id) && liquido > 0);

  const notas: NotaPlanejada[] = [];
  const grupos = new Map<string, typeof pendentes>();
  for (const p of pendentes.filter((p) => p.item.tipo === "servico")) {
    const codigo = codigoTributacaoNacional(p.item.servicos?.codigo_servico ?? "");
    grupos.set(codigo, [...(grupos.get(codigo) ?? []), p]);
  }
  for (const [codigo, itens] of grupos) {
    notas.push({
      tipo: "nfse",
      descricao: `NFS-e — serviços (código ${codigo.replace(/^(\d{2})(\d{2})(\d{2})$/, "$1.$2.$3")})`,
      itens: itens.map(({ item, liquido }) => ({ os_item_id: item.id, descricao: item.descricao, total_centavos: liquido })),
      total_centavos: itens.reduce((s, i) => s + i.liquido, 0),
    });
  }
  const produtos = pendentes.filter((p) => p.item.tipo === "produto");
  if (produtos.length) {
    const tipo = tipoProdutos ?? (os.clientes?.tipo_pessoa === "PJ" ? "nfe" : "nfce");
    notas.push({
      tipo,
      descricao: tipo === "nfe" ? "NF-e — produtos" : "NFC-e — produtos (consumidor final)",
      itens: produtos.map(({ item, liquido }) => ({ os_item_id: item.id, descricao: item.descricao, total_centavos: liquido })),
      total_centavos: produtos.reduce((s, i) => s + i.liquido, 0),
    });
  }
  return notas;
}

function destinatario(c: Tabela<"clientes"> | null): DestinatarioFiscal | null {
  if (!c) return null;
  const enderecoCompleto = c.codigo_municipio && c.logradouro && c.bairro && c.cidade && c.uf && c.cep;
  return {
    tipo_pessoa: c.tipo_pessoa,
    cpf_cnpj: c.cpf_cnpj ? normalizarDocumento(c.cpf_cnpj) : null,
    nome: c.nome,
    inscricao_estadual: c.inscricao_estadual,
    email: c.email,
    telefone: c.whatsapp ?? c.telefone,
    endereco: enderecoCompleto
      ? {
          logradouro: c.logradouro!,
          numero: c.numero ?? "S/N",
          complemento: c.complemento,
          bairro: c.bairro!,
          cidade: c.cidade!,
          uf: c.uf!,
          cep: somenteDigitos(c.cep),
          codigo_municipio: c.codigo_municipio!,
        }
      : null,
  };
}

function formaFiscal(f: Tabela<"ordens_servico">["forma_pagamento"]): FormaPagamentoFiscal {
  return f ?? "outros";
}

function responsavelTecnico(): PedidoEmissao["responsavel_tecnico"] {
  const cnpj = somenteDigitos(process.env.RESP_TECNICO_CNPJ);
  if (cnpj.length !== 14) return null;
  return {
    cnpj,
    contato: process.env.RESP_TECNICO_CONTATO ?? "Órion Automação Inteligente",
    email: process.env.RESP_TECNICO_EMAIL ?? "",
    telefone: process.env.RESP_TECNICO_FONE ?? "",
  };
}

/** Monta o pedido de emissão a partir da OS e dos itens escolhidos */
async function montarPedido(
  admin: ClienteAdmin,
  empresa: Tabela<"empresas">,
  config: Tabela<"empresa_config_fiscal">,
  os: OSCompleta,
  nota: { tipo: TipoNota; serie: string; numero: number; referencia: string; os_item_ids: string[]; data_emissao: string },
): Promise<PedidoEmissao> {
  const liquidos = liquidoPorItem(
    os.os_itens.map((i) => ({ quantidade: Number(i.quantidade), preco_unitario_centavos: i.preco_unitario_centavos, desconto_centavos: i.desconto_centavos })),
    os.desconto_total_centavos,
  );
  const itens: ItemFiscal[] = [];
  os.os_itens.forEach((i, idx) => {
    if (!nota.os_item_ids.includes(i.id)) return;
    const bruto = Math.round(i.preco_unitario_centavos * Number(i.quantidade));
    const liquido = liquidos[idx] ?? 0;
    const p = i.produtos;
    const s = i.servicos;
    itens.push({
      numero: itens.length + 1,
      codigo: (p?.codigo ?? s?.codigo ?? i.id.slice(0, 8)).slice(0, 60),
      descricao: i.descricao,
      quantidade: Number(i.quantidade),
      unidade: i.unidade === "M2" ? "M2" : i.unidade,
      valor_unitario_centavos: i.preco_unitario_centavos,
      valor_bruto_centavos: bruto,
      desconto_centavos: Math.max(0, bruto - liquido),
      ncm: p?.ncm,
      cest: p?.cest,
      cfop: p?.cfop,
      origem: p?.origem,
      csosn: p?.csosn,
      cst_icms: p?.cst_icms,
      aliquota_icms: p?.aliquota_icms,
      cst_pis: p?.cst_pis,
      cst_cofins: p?.cst_cofins,
      codigo_barras: p?.codigo_barras,
      codigo_servico: s?.codigo_servico,
      codigo_tributacao_municipal: s?.codigo_tributacao_municipal ?? config.nfse_codigo_tributacao_municipal,
      codigo_nbs: s?.codigo_nbs,
      aliquota_iss: s?.aliquota_iss ?? config.nfse_aliquota_iss,
      cst_ibs_cbs: p?.cst_ibs_cbs ?? s?.cst_ibs_cbs,
      cclass_trib: p?.cclass_trib ?? s?.cclass_trib,
    });
  });

  let nfseProvedor: "nacional" | "padrao" | undefined;
  if (nota.tipo === "nfse") {
    if (config.nfse_provedor === "nacional" || config.nfse_provedor === "padrao") nfseProvedor = config.nfse_provedor;
    else {
      try {
        const m = empresa.codigo_municipio ? await obterProvedorFiscal().consultarMunicipio(empresa.codigo_municipio) : null;
        nfseProvedor = m?.nacional === false ? "padrao" : "nacional";
      } catch {
        nfseProvedor = "nacional";
      }
    }
  }

  const total = itens.reduce((s, i) => s + i.valor_bruto_centavos - i.desconto_centavos, 0);
  const placa = os.veiculos?.placa ? ` · Placa ${os.veiculos.placa}` : "";
  return {
    tipo: nota.tipo,
    ambiente: config.ambiente,
    referencia: nota.referencia,
    serie: nota.serie,
    numero: nota.numero,
    data_emissao: nota.data_emissao,
    emitente: emitenteDaEmpresa(empresa),
    destinatario: destinatario(os.clientes),
    itens,
    pagamentos: [{ forma: formaFiscal(os.forma_pagamento), valor_centavos: total }],
    informacoes_adicionais: `OS nº ${os.numero}${placa}`,
    natureza_operacao: config.natureza_operacao,
    nfse_provedor: nfseProvedor,
    nfse_regime_especial: config.nfse_regime_especial,
    ibscbs: {
      informar: config.informar_ibs_cbs,
      aliquota_ibs_uf: Number(config.aliquota_ibs_uf),
      aliquota_ibs_mun: Number(config.aliquota_ibs_mun),
      aliquota_cbs: Number(config.aliquota_cbs),
    },
    responsavel_tecnico: responsavelTecnico(),
  };
}

/** Data/hora atual no fuso de Brasília com offset (exigido pela SEFAZ) */
export function agoraComFuso(agora = new Date()): string {
  const local = new Date(agora.getTime() - 3 * 3600_000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
}

async function guardarArquivos(admin: ClienteAdmin, nota: Tabela<"notas_fiscais">): Promise<{ xml_path: string | null; pdf_path: string | null }> {
  const provedor = obterProvedorFiscal();
  const base = `${nota.empresa_id}/notas/${nota.id}`;
  let xml_path: string | null = nota.xml_path;
  let pdf_path: string | null = nota.pdf_path;
  try {
    const xml = await provedor.baixarXml(nota.tipo, nota.provedor_id!);
    const r = await admin.storage.from("empresa").upload(`${base}/${nota.tipo}-${nota.numero ?? "sn"}.xml`, xml, { contentType: "application/xml", upsert: true });
    if (!r.error) xml_path = r.data.path;
  } catch (e) {
    console.error("[fiscal] falha ao baixar XML", e);
  }
  try {
    const pdf = await provedor.baixarPdf(nota.tipo, nota.provedor_id!);
    const r = await admin.storage.from("empresa").upload(`${base}/${nota.tipo}-${nota.numero ?? "sn"}.pdf`, pdf, { contentType: "application/pdf", upsert: true });
    if (!r.error) pdf_path = r.data.path;
  } catch (e) {
    console.error("[fiscal] falha ao baixar PDF", e);
  }
  return { xml_path, pdf_path };
}

/** Próxima consulta de segurança: 10 s, 30 s, 1 min, 2 min, 5 min, 15 min, 1 h */
function proximaSincronizacao(tentativas: number): string {
  const espera = [10, 30, 60, 120, 300, 900, 3600][Math.min(tentativas, 6)]!;
  return new Date(Date.now() + espera * 1000).toISOString();
}

/** Aplica a resposta da API na nota (e guarda XML/PDF quando autorizada) */
async function aplicarResposta(admin: ClienteAdmin, nota: Tabela<"notas_fiscais">, r: RespostaDocumento, sincronizacoes: number): Promise<Tabela<"notas_fiscais">> {
  const rejeitada = r.status === "rejeitada" || r.status === "erro";
  const atualizacao = {
    provedor_id: r.provedor_id || nota.provedor_id,
    status: r.status,
    numero: r.numero ?? nota.numero,
    serie: r.serie ?? nota.serie,
    chave: r.chave ?? nota.chave,
    protocolo: r.protocolo ?? nota.protocolo,
    codigo_verificacao: r.codigo_verificacao ?? nota.codigo_verificacao,
    link_url: r.link_url ?? nota.link_url,
    data_emissao: r.data_emissao ?? nota.data_emissao,
    codigo_rejeicao: rejeitada ? (r.codigo_status ?? r.mensagens[0]?.codigo ?? null) : null,
    motivo_rejeicao: rejeitada ? (r.motivo_status ?? r.mensagens.map((m) => m.descricao).join(" | ") ?? null) : null,
    motivo_amigavel: rejeitada ? traduzirRejeicao(r.mensagens, r.motivo_status, r.codigo_status) : null,
    mensagens: r.mensagens as never,
    resposta: (r.bruto ?? null) as never,
    ultima_sincronizacao: new Date().toISOString(),
    proxima_sincronizacao: r.status === "processando" ? proximaSincronizacao(sincronizacoes) : null,
  };
  const { data } = await admin.from("notas_fiscais").update(atualizacao).eq("id", nota.id).select().single();
  let atual = data ?? { ...nota, ...atualizacao };
  if (r.status === "autorizada" && (!atual.xml_path || !atual.pdf_path)) {
    const arquivos = await guardarArquivos(admin, atual as Tabela<"notas_fiscais">);
    const { data: comArquivos } = await admin.from("notas_fiscais").update(arquivos).eq("id", nota.id).select().single();
    if (comArquivos) atual = comArquivos;
  }
  return atual as Tabela<"notas_fiscais">;
}

async function dadosEmpresa(admin: ClienteAdmin, empresaId: string) {
  const [{ data: empresa }, { data: config }] = await Promise.all([
    admin.from("empresas").select("*").eq("id", empresaId).single(),
    admin.from("empresa_config_fiscal").select("*").eq("empresa_id", empresaId).single(),
  ]);
  if (!empresa || !config) throw new ErroFiscal("Empresa sem configuração fiscal.");
  return { empresa, config };
}

async function reservarNumero(admin: ClienteAdmin, empresaId: string, tipo: TipoNota): Promise<{ serie: string; numero: number }> {
  const coluna = tipo === "nfse" ? "nfse_proximo_numero" : tipo === "nfce" ? "nfce_proximo_numero" : "nfe_proximo_numero";
  // Atualização atômica (o banco serializa as linhas): lê e incrementa na mesma instrução
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const { data: c } = await admin.from("empresa_config_fiscal").select("*").eq("empresa_id", empresaId).single();
    if (!c) throw new ErroFiscal("Configuração fiscal não encontrada.");
    const atual = c[coluna] as number;
    const { data: ok } = await admin
      .from("empresa_config_fiscal")
      .update({ [coluna]: atual + 1 } as AtualizaLinha<"empresa_config_fiscal">)
      .eq("empresa_id", empresaId)
      .eq(coluna, atual)
      .select("empresa_id");
    if (ok && ok.length === 1) {
      const serie = tipo === "nfse" ? c.nfse_serie : tipo === "nfce" ? String(c.nfce_serie) : String(c.nfe_serie);
      return { serie, numero: atual };
    }
  }
  throw new ErroFiscal("Não foi possível reservar o número da nota. Tente novamente.");
}

/** Envia (ou reenvia) uma nota já gravada no banco */
async function transmitir(admin: ClienteAdmin, nota: Tabela<"notas_fiscais">, osId: string): Promise<Tabela<"notas_fiscais">> {
  const { empresa, config } = await dadosEmpresa(admin, nota.empresa_id);
  const os = await carregarOS(admin, nota.empresa_id, osId);
  if (!os) throw new ErroFiscal("OS não encontrada.");
  const { data: itensNota } = await admin.from("nota_itens").select("os_item_id").eq("nota_id", nota.id);
  const pedido = await montarPedido(admin, empresa, config, os, {
    tipo: nota.tipo,
    serie: nota.serie ?? "1",
    numero: Number(nota.numero),
    referencia: nota.referencia,
    os_item_ids: (itensNota ?? []).map((i) => i.os_item_id).filter(Boolean) as string[],
    data_emissao: agoraComFuso(),
  });

  const erros = validarPedido(pedido);
  if (erros.length) {
    const { data } = await admin
      .from("notas_fiscais")
      .update({ status: "erro", motivo_rejeicao: erros.join(" "), motivo_amigavel: erros.join(" "), codigo_rejeicao: null, payload: pedido as never, ambiente: config.ambiente })
      .eq("id", nota.id)
      .select()
      .single();
    return data!;
  }

  const ibs = totaisIbsCbs(pedido);
  await admin
    .from("notas_fiscais")
    .update({
      status: "processando",
      payload: pedido as never,
      ambiente: config.ambiente,
      provedor: obterProvedorFiscal().nome,
      nfse_provedor: pedido.nfse_provedor ?? null,
      valor_ibs_centavos: pedido.ibscbs.informar ? ibs.ibs : 0,
      valor_cbs_centavos: pedido.ibscbs.informar ? ibs.cbs : 0,
      tentativas: nota.tentativas + 1,
      motivo_rejeicao: null,
      motivo_amigavel: null,
      codigo_rejeicao: null,
    })
    .eq("id", nota.id);

  try {
    const resposta = await obterProvedorFiscal().emitir(pedido);
    return await aplicarResposta(admin, { ...nota, tentativas: nota.tentativas + 1 }, resposta, 0);
  } catch (e) {
    const mensagens = e instanceof ErroFiscal ? e.mensagens : [];
    const motivo = traduzirErro(e);
    const { data } = await admin
      .from("notas_fiscais")
      .update({
        status: "erro",
        motivo_rejeicao: motivo,
        motivo_amigavel: mensagens.length ? traduzirRejeicao(mensagens, motivo) : `Não foi possível enviar a nota: ${motivo}`,
        mensagens: mensagens as never,
      })
      .eq("id", nota.id)
      .select()
      .single();
    return data!;
  }
}

/** Emite as notas de uma OS concluída. A permissão (papel e acesso à OS) deve ser verificada antes. */
export async function emitirNotasDaOS(empresaId: string, usuarioId: string, osId: string, tipoProdutos?: "nfce" | "nfe"): Promise<Tabela<"notas_fiscais">[]> {
  const admin = criarClienteAdmin();
  const os = await carregarOS(admin, empresaId, osId);
  if (!os) throw new ErroFiscal("OS não encontrada.");
  if (!["concluida", "entregue"].includes(os.status)) throw new ErroFiscal("Conclua a OS antes de emitir as notas.");
  const plano = await planejarNotas(empresaId, osId, tipoProdutos);
  if (plano.length === 0) throw new ErroFiscal("Todos os itens desta OS já têm nota emitida.");
  const { config } = await dadosEmpresa(admin, empresaId);

  const resultado: Tabela<"notas_fiscais">[] = [];
  for (const planejada of plano) {
    const { serie, numero } = await reservarNumero(admin, empresaId, planejada.tipo);
    const { count } = await admin.from("notas_fiscais").select("id", { count: "exact", head: true }).eq("os_id", osId).eq("tipo", planejada.tipo);
    const { data: nota, error } = await admin
      .from("notas_fiscais")
      .insert({
        empresa_id: empresaId,
        os_id: osId,
        cliente_id: os.cliente_id,
        tipo: planejada.tipo,
        status: "rascunho",
        ambiente: config.ambiente,
        provedor: obterProvedorFiscal().nome,
        referencia: `os${os.numero}-${planejada.tipo}-${(count ?? 0) + 1}-${Date.now().toString(36)}`,
        serie,
        numero: String(numero),
        valor_total_centavos: planejada.total_centavos,
        created_by: usuarioId,
        updated_by: usuarioId,
      })
      .select()
      .single();
    if (error || !nota) throw error ?? new ErroFiscal("Falha ao registrar a nota.");
    const osItens = new Map(os.os_itens.map((i) => [i.id, i]));
    await admin.from("nota_itens").insert(
      planejada.itens.map((it, idx) => {
        const oi = osItens.get(it.os_item_id)!;
        return {
          empresa_id: empresaId,
          nota_id: nota.id,
          os_item_id: it.os_item_id,
          numero_item: idx + 1,
          codigo: oi.produtos?.codigo ?? oi.servicos?.codigo ?? null,
          descricao: it.descricao,
          quantidade: Number(oi.quantidade),
          unidade: oi.unidade,
          valor_unitario_centavos: oi.preco_unitario_centavos,
          desconto_centavos: Math.max(0, Math.round(oi.preco_unitario_centavos * Number(oi.quantidade)) - it.total_centavos),
          valor_total_centavos: it.total_centavos,
          ncm: oi.produtos?.ncm ?? null,
          cfop: oi.produtos?.cfop ?? null,
          origem: oi.produtos?.origem ?? null,
          csosn: oi.produtos?.csosn ?? null,
          cst_icms: oi.produtos?.cst_icms ?? null,
          codigo_servico: oi.servicos?.codigo_servico ?? null,
          codigo_tributacao_municipal: oi.servicos?.codigo_tributacao_municipal ?? null,
          aliquota_iss: oi.servicos?.aliquota_iss ?? null,
          cst_ibs_cbs: oi.produtos?.cst_ibs_cbs ?? oi.servicos?.cst_ibs_cbs ?? null,
          cclass_trib: oi.produtos?.cclass_trib ?? oi.servicos?.cclass_trib ?? null,
          aliquota_ibs_uf: config.aliquota_ibs_uf,
          aliquota_ibs_mun: config.aliquota_ibs_mun,
          aliquota_cbs: config.aliquota_cbs,
          created_by: usuarioId,
        };
      }),
    );
    resultado.push(await transmitir(admin, nota, osId));
  }
  return resultado;
}

/** Consulta a situação da nota na API (usado pela tela, pelo webhook e pela rotina periódica) */
export async function sincronizarNota(notaId: string, empresaId?: string): Promise<Tabela<"notas_fiscais"> | null> {
  const admin = criarClienteAdmin();
  let consulta = admin.from("notas_fiscais").select("*").eq("id", notaId);
  if (empresaId) consulta = consulta.eq("empresa_id", empresaId);
  const { data: nota } = await consulta.maybeSingle();
  if (!nota || !nota.provedor_id) return nota;
  if (nota.status !== "processando" && !(nota.status === "autorizada" && (!nota.xml_path || !nota.pdf_path))) return nota;
  try {
    const r = await obterProvedorFiscal().consultar(nota.tipo, nota.provedor_id);
    const sincronizacoes = nota.ultima_sincronizacao ? Math.round((Date.now() - new Date(nota.created_at).getTime()) / 20_000) : 0;
    return await aplicarResposta(admin, nota, r, sincronizacoes);
  } catch (e) {
    console.error("[fiscal] sincronização falhou", notaId, e);
    await admin
      .from("notas_fiscais")
      .update({ ultima_sincronizacao: new Date().toISOString(), proxima_sincronizacao: proximaSincronizacao(6) })
      .eq("id", nota.id);
    return nota;
  }
}

/** Rotina periódica: sincroniza notas em processamento de todas as empresas */
export async function sincronizarPendentes(limite = 50): Promise<{ verificadas: number; atualizadas: number }> {
  const admin = criarClienteAdmin();
  const { data } = await admin
    .from("notas_fiscais")
    .select("id, status")
    .eq("status", "processando")
    .or(`proxima_sincronizacao.is.null,proxima_sincronizacao.lte.${new Date().toISOString()}`)
    .order("proxima_sincronizacao", { ascending: true, nullsFirst: true })
    .limit(limite);
  let atualizadas = 0;
  for (const n of data ?? []) {
    const r = await sincronizarNota(n.id);
    if (r && r.status !== "processando") atualizadas++;
  }
  return { verificadas: data?.length ?? 0, atualizadas };
}

/** Reenvia uma nota rejeitada (ou com erro) depois que os dados foram corrigidos */
export async function reenviarNota(notaId: string, empresaId: string): Promise<Tabela<"notas_fiscais">> {
  const admin = criarClienteAdmin();
  const { data: nota } = await admin.from("notas_fiscais").select("*").eq("id", notaId).eq("empresa_id", empresaId).maybeSingle();
  if (!nota) throw new ErroFiscal("Nota não encontrada.");
  if (!["rejeitada", "erro"].includes(nota.status)) throw new ErroFiscal("Só é possível reenviar notas rejeitadas ou com erro.");
  if (!nota.os_id) throw new ErroFiscal("Nota sem OS vinculada.");
  // Nova referência (a API não aceita repetir) e mesmo número: rejeição não consome a numeração
  const { data: atualizada } = await admin
    .from("notas_fiscais")
    .update({ referencia: `${nota.referencia.replace(/-r\d+$/, "")}-r${nota.tentativas + 1}`, provedor_id: null })
    .eq("id", nota.id)
    .select()
    .single();
  return transmitir(admin, atualizada!, nota.os_id);
}

export async function cancelarNota(notaId: string, empresaId: string, justificativa: string, usuarioId: string) {
  const admin = criarClienteAdmin();
  const { data: nota } = await admin.from("notas_fiscais").select("*").eq("id", notaId).eq("empresa_id", empresaId).maybeSingle();
  if (!nota) throw new ErroFiscal("Nota não encontrada.");
  if (nota.status !== "autorizada") throw new ErroFiscal("Só notas autorizadas podem ser canceladas.");
  if (justificativa.trim().length < 15) throw new ErroFiscal("A justificativa deve ter pelo menos 15 caracteres.");
  const prazo = PRAZO_CANCELAMENTO_HORAS[nota.tipo];
  const emitidaEm = new Date(nota.data_emissao ?? nota.created_at).getTime();
  if (prazo !== null && Date.now() - emitidaEm > prazo * 3600_000) {
    throw new ErroFiscal(
      nota.tipo === "nfce"
        ? "O prazo de cancelamento da NFC-e (30 minutos) já passou. Fale com o contador sobre a regularização."
        : "O prazo de cancelamento da NF-e (24 horas) já passou. Fale com o contador (nota de devolução/estorno).",
    );
  }
  const r = await obterProvedorFiscal().cancelar(nota.tipo, nota.provedor_id!, justificativa.trim());
  await admin.from("notas_eventos").insert({
    empresa_id: empresaId,
    nota_id: nota.id,
    tipo: "cancelamento",
    status: r.status,
    texto: justificativa.trim(),
    provedor_id: r.provedor_id ?? null,
    protocolo: r.protocolo ?? null,
    mensagem: r.mensagem ?? null,
    resposta: (r.bruto ?? null) as never,
    created_by: usuarioId,
  });
  if (r.status === "rejeitado" || r.status === "erro") throw new ErroFiscal(`Cancelamento recusado: ${r.mensagem ?? "sem detalhes"}`);
  if (r.status === "registrado") {
    await admin.from("notas_fiscais").update({ status: "cancelada", cancelada_em: new Date().toISOString(), motivo_cancelamento: justificativa.trim() }).eq("id", nota.id);
  }
  return r;
}

export async function emitirCartaCorrecao(notaId: string, empresaId: string, correcao: string, usuarioId: string) {
  const admin = criarClienteAdmin();
  const { data: nota } = await admin.from("notas_fiscais").select("*").eq("id", notaId).eq("empresa_id", empresaId).maybeSingle();
  if (!nota) throw new ErroFiscal("Nota não encontrada.");
  if (nota.tipo !== "nfe") throw new ErroFiscal("A carta de correção só existe para NF-e.");
  if (nota.status !== "autorizada") throw new ErroFiscal("Só notas autorizadas aceitam carta de correção.");
  const texto = correcao.trim();
  if (texto.length < 15 || texto.length > 1000) throw new ErroFiscal("A correção deve ter entre 15 e 1.000 caracteres.");
  const { count } = await admin.from("notas_eventos").select("id", { count: "exact", head: true }).eq("nota_id", nota.id).eq("tipo", "carta_correcao").eq("status", "registrado");
  if ((count ?? 0) >= 20) throw new ErroFiscal("Limite de 20 cartas de correção por NF-e atingido.");
  const provedor = obterProvedorFiscal();
  const r = await provedor.cartaCorrecao(nota.provedor_id!, texto);
  const { data: evento } = await admin
    .from("notas_eventos")
    .insert({
      empresa_id: empresaId,
      nota_id: nota.id,
      tipo: "carta_correcao",
      sequencia: (count ?? 0) + 1,
      status: r.status,
      texto,
      provedor_id: r.provedor_id ?? null,
      protocolo: r.protocolo ?? null,
      mensagem: r.mensagem ?? null,
      resposta: (r.bruto ?? null) as never,
      created_by: usuarioId,
    })
    .select()
    .single();
  if (r.status === "rejeitado" || r.status === "erro") throw new ErroFiscal(`Carta de correção recusada: ${r.mensagem ?? "sem detalhes"}`);
  if (r.status === "registrado" && evento) {
    try {
      const pdf = await provedor.baixarPdfCartaCorrecao(nota.provedor_id!);
      const up = await admin.storage.from("empresa").upload(`${empresaId}/notas/${nota.id}/cce-${evento.sequencia}.pdf`, pdf, { contentType: "application/pdf", upsert: true });
      if (!up.error) await admin.from("notas_eventos").update({ pdf_path: up.data.path }).eq("id", evento.id);
    } catch (e) {
      console.error("[fiscal] PDF da CC-e", e);
    }
  }
  return r;
}
