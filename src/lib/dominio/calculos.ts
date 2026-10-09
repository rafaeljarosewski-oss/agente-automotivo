/**
 * Regras de cálculo do negócio (preço, área, consumo de película, totais, comissão e parcelas).
 * Funções puras e cobertas por testes unitários. Todos os valores monetários em centavos.
 */
import { dividirCentavos, multiplicarCentavos, percentualDe, ratear } from "./dinheiro";
import { somarDias, somarMeses } from "./datas";

// ---------------------------------------------------------------------------
// Preço de serviço
// ---------------------------------------------------------------------------

export type TipoPrecoServico = "fixo" | "categoria" | "m2" | "pelicula";

export interface ServicoParaPreco {
  tipo_preco: TipoPrecoServico;
  preco_centavos: number;
  /** preços por categoria de veículo: { [categoria_id]: centavos } */
  precos_categoria?: Record<string, number>;
}

export interface LinhaTabelaPelicula {
  linha_id: string;
  categoria_id: string;
  preco_centavos: number;
  consumo_metros: number;
}

/**
 * Preço unitário sugerido de um serviço.
 * - fixo: preço do cadastro
 * - categoria: preço da categoria do veículo; sem categoria (ou sem preço), cai no preço base
 * - m2: preço por m² (a quantidade do item é a área)
 */
export function precoUnitarioServico(servico: ServicoParaPreco, categoriaId: string | null | undefined): number {
  if (servico.tipo_preco === "categoria" && categoriaId) {
    const preco = servico.precos_categoria?.[categoriaId];
    if (preco !== undefined && preco !== null) return preco;
  }
  return servico.preco_centavos;
}

/** Preço e consumo padrão de película pela tabela linha × categoria */
export function precoPelicula(
  tabela: LinhaTabelaPelicula[],
  linhaId: string,
  categoriaId: string | null | undefined,
): { preco_centavos: number; consumo_metros: number } | null {
  if (!categoriaId) return null;
  const linha = tabela.find((t) => t.linha_id === linhaId && t.categoria_id === categoriaId);
  return linha ? { preco_centavos: linha.preco_centavos, consumo_metros: Number(linha.consumo_metros) } : null;
}

// ---------------------------------------------------------------------------
// Película residencial: área (m²) e consumo do rolo (m)
// ---------------------------------------------------------------------------

export interface MedidaVidro {
  descricao?: string;
  largura_m: number;
  altura_m: number;
  quantidade: number;
}

/** Arredonda para N casas decimais evitando erros de ponto flutuante */
export function arredondarCasas(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

/** Área de um vidro (m²) */
export function areaVidro(m: MedidaVidro): number {
  if (m.largura_m <= 0 || m.altura_m <= 0 || m.quantidade <= 0) return 0;
  return arredondarCasas(m.largura_m * m.altura_m * m.quantidade, 4);
}

/** Área total (m²) de uma lista de vidros */
export function areaTotal(medidas: MedidaVidro[]): number {
  return arredondarCasas(
    medidas.reduce((soma, m) => soma + areaVidro(m), 0),
    4,
  );
}

/**
 * Metros lineares de película consumidos para cobrir uma área, considerando a largura do rolo
 * e uma margem de perda no corte. Arredonda para cima no centímetro.
 */
export function consumoPorArea(areaM2: number, larguraRoloM: number, perdaPercentual = 10): number {
  if (areaM2 <= 0) return 0;
  if (larguraRoloM <= 0) throw new Error("Largura do rolo inválida.");
  const metros = (areaM2 / larguraRoloM) * (1 + perdaPercentual / 100);
  return Math.ceil(arredondarCasas(metros, 6) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Totais
// ---------------------------------------------------------------------------

export interface ItemValor {
  quantidade: number;
  preco_unitario_centavos: number;
  desconto_centavos?: number;
}

export interface ItemCalculado {
  bruto_centavos: number;
  desconto_centavos: number;
  total_centavos: number;
}

/** Total de um item: quantidade × preço − desconto (o desconto nunca passa do bruto) */
export function calcularItem(item: ItemValor): ItemCalculado {
  if (item.quantidade <= 0) throw new Error("A quantidade deve ser maior que zero.");
  if (item.preco_unitario_centavos < 0) throw new Error("O preço não pode ser negativo.");
  const bruto = multiplicarCentavos(item.preco_unitario_centavos, item.quantidade);
  const desconto = Math.min(Math.max(item.desconto_centavos ?? 0, 0), bruto);
  return { bruto_centavos: bruto, desconto_centavos: desconto, total_centavos: bruto - desconto };
}

export interface Totais {
  subtotal_centavos: number; // soma dos valores brutos
  desconto_itens_centavos: number;
  desconto_total_centavos: number; // desconto no total (limitado ao que sobra)
  total_centavos: number;
}

export function calcularTotais(itens: ItemValor[], descontoTotalCentavos = 0): Totais {
  const calculados = itens.map(calcularItem);
  const subtotal = calculados.reduce((s, i) => s + i.bruto_centavos, 0);
  const descontoItens = calculados.reduce((s, i) => s + i.desconto_centavos, 0);
  const liquidoItens = subtotal - descontoItens;
  const descontoTotal = Math.min(Math.max(descontoTotalCentavos, 0), liquidoItens);
  return {
    subtotal_centavos: subtotal,
    desconto_itens_centavos: descontoItens,
    desconto_total_centavos: descontoTotal,
    total_centavos: liquidoItens - descontoTotal,
  };
}

/** Converte um desconto percentual no total em centavos */
export function descontoPercentual(valorCentavos: number, percentual: number): number {
  if (percentual < 0 || percentual > 100) throw new Error("Percentual de desconto inválido.");
  return percentualDe(valorCentavos, percentual);
}

/**
 * Valor líquido de cada item depois de ratear o desconto do total (usado em notas fiscais
 * e como base de comissão). A soma dos líquidos é exatamente o total.
 */
export function liquidoPorItem(itens: ItemValor[], descontoTotalCentavos: number): number[] {
  const totais = itens.map((i) => calcularItem(i).total_centavos);
  const rateio = ratear(Math.min(descontoTotalCentavos, totais.reduce((a, b) => a + b, 0)), totais);
  return totais.map((t, i) => t - (rateio[i] ?? 0));
}

// ---------------------------------------------------------------------------
// Comissão do instalador
// ---------------------------------------------------------------------------

export interface RegraComissao {
  comissao_tipo: "nenhuma" | "percentual" | "fixo";
  comissao_percentual: number;
  comissao_fixo_centavos: number;
}

/**
 * Comissão de um item de serviço.
 * - percentual: % sobre o valor líquido do item (após descontos)
 * - fixo: valor por unidade executada; para serviços cobrados por m², o fixo vale pelo serviço inteiro
 */
export function calcularComissao(
  regra: RegraComissao,
  baseLiquidaCentavos: number,
  quantidade: number,
  cobradoPorArea = false,
): number {
  switch (regra.comissao_tipo) {
    case "percentual":
      return Math.max(0, percentualDe(baseLiquidaCentavos, regra.comissao_percentual));
    case "fixo":
      return cobradoPorArea ? regra.comissao_fixo_centavos : multiplicarCentavos(regra.comissao_fixo_centavos, quantidade);
    default:
      return 0;
  }
}

export interface ItemParaComissao extends ItemValor {
  id: string;
  tipo: "servico" | "produto";
  instalador_id: string | null;
  regra: RegraComissao | null;
  cobrado_por_area?: boolean;
}

export interface ComissaoGerada {
  os_item_id: string;
  instalador_id: string;
  base_centavos: number;
  valor_centavos: number;
}

/** Gera as comissões de uma OS (itens de serviço com instalador definido no item ou na OS) */
export function gerarComissoes(
  itens: ItemParaComissao[],
  descontoTotalCentavos: number,
  instaladorOS: string | null,
): ComissaoGerada[] {
  const liquidos = liquidoPorItem(itens, descontoTotalCentavos);
  const resultado: ComissaoGerada[] = [];
  itens.forEach((item, i) => {
    const instalador = item.instalador_id ?? instaladorOS;
    if (item.tipo !== "servico" || !instalador || !item.regra) return;
    const base = liquidos[i] ?? 0;
    const valor = calcularComissao(item.regra, base, item.quantidade, item.cobrado_por_area);
    if (valor > 0) resultado.push({ os_item_id: item.id, instalador_id: instalador, base_centavos: base, valor_centavos: valor });
  });
  return resultado;
}

// ---------------------------------------------------------------------------
// Parcelas (contas a receber)
// ---------------------------------------------------------------------------

export type FormaPagamento = "dinheiro" | "pix" | "debito" | "credito_vista" | "credito_parcelado" | "boleto";

export interface Parcela {
  parcela: number;
  valor_centavos: number;
  vencimento: string; // aaaa-mm-dd
  forma_pagamento: FormaPagamento | null;
}

export const FORMAS_A_VISTA: FormaPagamento[] = ["dinheiro", "pix", "debito", "credito_vista"];

/**
 * Gera as parcelas de um recebimento.
 * - À vista (dinheiro, Pix, débito, crédito à vista) ou forma indefinida: 1 parcela vencendo na data base
 * - Crédito parcelado: N parcelas a cada 30 dias (repasse da maquininha)
 * - Boleto: N parcelas mensais, a primeira 30 dias após a data base (mesmo dia nos meses seguintes)
 * A soma das parcelas é sempre exatamente o total; os centavos que sobram vão nas primeiras.
 */
export function gerarParcelas(
  totalCentavos: number,
  forma: FormaPagamento | null,
  quantidade: number,
  dataBaseISO: string,
): Parcela[] {
  if (totalCentavos <= 0) return [];
  const aVista = forma === null || FORMAS_A_VISTA.includes(forma);
  const n = aVista ? 1 : Math.max(1, Math.min(24, Math.trunc(quantidade)));
  const valores = dividirCentavos(totalCentavos, n);
  return valores.map((valor, i) => ({
    parcela: i + 1,
    valor_centavos: valor,
    vencimento: aVista
      ? dataBaseISO
      : forma === "credito_parcelado"
        ? somarDias(dataBaseISO, 30 * (i + 1))
        : somarMeses(somarDias(dataBaseISO, 30), i),
    forma_pagamento: forma,
  }));
}

// ---------------------------------------------------------------------------
// Reforma tributária (IBS / CBS)
// ---------------------------------------------------------------------------

export interface AliquotasIbsCbs {
  ibs_uf: number; // %
  ibs_mun: number; // %
  cbs: number; // %
}

export function calcularIbsCbs(baseCentavos: number, aliquotas: AliquotasIbsCbs) {
  const ibsUf = percentualDe(baseCentavos, aliquotas.ibs_uf);
  const ibsMun = percentualDe(baseCentavos, aliquotas.ibs_mun);
  const cbs = percentualDe(baseCentavos, aliquotas.cbs);
  return { ibs_uf_centavos: ibsUf, ibs_mun_centavos: ibsMun, ibs_centavos: ibsUf + ibsMun, cbs_centavos: cbs };
}
