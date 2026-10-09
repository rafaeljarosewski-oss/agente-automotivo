/**
 * Itens em edição (orçamento e OS): tipos e funções puras, usáveis no servidor e no navegador.
 */
import { calcularItem, precoPelicula, precoUnitarioServico, type MedidaVidro } from "@/lib/dominio/calculos";
import { centavosParaTexto, textoParaCentavos } from "@/lib/dominio/dinheiro";
import type { CatalogoEditor } from "@/lib/consultas/catalogo";
import { paraNumero } from "@/lib/validacao/comum";

export interface MedidaRascunho {
  descricao: string;
  largura_m: string;
  altura_m: string;
  quantidade: string;
}

export interface ItemRascunho {
  chave: string;
  id?: string;
  tipo: "servico" | "produto";
  servico_id?: string | null;
  produto_id?: string | null;
  linha_pelicula_id?: string | null;
  descricao: string;
  quantidade: string;
  unidade: string;
  preco: string;
  desconto: string;
  medidas?: MedidaRascunho[] | null;
  consumo_metros?: number | null;
  precoManual?: boolean;
  instalador_id?: string | null;
  numeros_serie?: string[];
}

let contador = 0;
export const novaChave = () => `i${Date.now().toString(36)}${(contador++).toString(36)}`;

export const fmtNum = (n: number | null | undefined, casas = 3) =>
  n === null || n === undefined ? "" : n.toLocaleString("pt-BR", { maximumFractionDigits: casas });

export function medidasParaNumeros(medidas: MedidaRascunho[] | null | undefined): MedidaVidro[] {
  return (medidas ?? [])
    .map((m) => ({
      descricao: m.descricao,
      largura_m: paraNumero(m.largura_m) ?? 0,
      altura_m: paraNumero(m.altura_m) ?? 0,
      quantidade: Math.max(0, Math.trunc(paraNumero(m.quantidade) ?? 0)),
    }))
    .filter((m) => m.largura_m > 0 && m.altura_m > 0 && m.quantidade > 0);
}

/** Valores numéricos de um item em edição (para mostrar totais) */
export function valoresItem(item: ItemRascunho) {
  const quantidade = paraNumero(item.quantidade) ?? 0;
  const preco = textoParaCentavos(item.preco) ?? 0;
  const desconto = textoParaCentavos(item.desconto) ?? 0;
  if (quantidade <= 0) return { quantidade: 0, preco, desconto: 0, total: 0 };
  const c = calcularItem({ quantidade, preco_unitario_centavos: preco, desconto_centavos: desconto });
  return { quantidade, preco, desconto: c.desconto_centavos, total: c.total_centavos };
}

/** Converte os itens em edição para o formato enviado à Server Action */
export function itensParaEnvio(itens: ItemRascunho[]) {
  return itens.map((i) => ({
    id: i.id,
    tipo: i.tipo,
    servico_id: i.servico_id ?? null,
    produto_id: i.produto_id ?? null,
    linha_pelicula_id: i.linha_pelicula_id ?? null,
    descricao: i.descricao,
    quantidade: i.quantidade,
    unidade: i.unidade,
    preco_unitario_centavos: i.preco,
    desconto_centavos: i.desconto,
    medidas: i.medidas?.length
      ? i.medidas.map((m) => ({ descricao: m.descricao, largura_m: m.largura_m, altura_m: m.altura_m, quantidade: m.quantidade }))
      : null,
    consumo_metros: i.consumo_metros ?? null,
    instalador_id: i.instalador_id ?? null,
    numeros_serie: i.numeros_serie ?? [],
  }));
}

/** Converte linhas do banco (orcamento_itens / os_itens) em itens editáveis */
export function itensDoBanco(
  linhas: {
    id: string;
    tipo: "servico" | "produto";
    servico_id: string | null;
    produto_id: string | null;
    linha_pelicula_id: string | null;
    descricao: string;
    quantidade: number;
    unidade: string;
    preco_unitario_centavos: number;
    desconto_centavos: number;
    medidas: unknown;
    consumo_metros: number | null;
    instalador_id?: string | null;
    numeros_serie?: string[];
  }[],
  manterId = true,
): ItemRascunho[] {
  return linhas.map((l) => ({
    chave: novaChave(),
    id: manterId ? l.id : undefined,
    tipo: l.tipo,
    servico_id: l.servico_id,
    produto_id: l.produto_id,
    linha_pelicula_id: l.linha_pelicula_id,
    descricao: l.descricao,
    quantidade: fmtNum(Number(l.quantidade), 4),
    unidade: l.unidade,
    preco: centavosParaTexto(l.preco_unitario_centavos),
    desconto: l.desconto_centavos ? centavosParaTexto(l.desconto_centavos) : "",
    medidas: Array.isArray(l.medidas)
      ? (l.medidas as MedidaVidro[]).map((m) => ({
          descricao: m.descricao ?? "",
          largura_m: fmtNum(m.largura_m),
          altura_m: fmtNum(m.altura_m),
          quantidade: String(m.quantidade),
        }))
      : null,
    consumo_metros: l.consumo_metros !== null ? Number(l.consumo_metros) : null,
    precoManual: true,
    instalador_id: l.instalador_id ?? null,
    numeros_serie: l.numeros_serie ?? [],
  }));
}

/** Preço sugerido para um item conforme o catálogo e a categoria do veículo */
export function precoSugerido(catalogo: CatalogoEditor, item: ItemRascunho, categoriaId: string | null): { preco: number | null; consumo: number | null } {
  if (item.tipo === "produto") {
    const p = catalogo.produtos.find((x) => x.id === item.produto_id);
    return { preco: p?.preco_venda_centavos ?? null, consumo: null };
  }
  if (item.linha_pelicula_id) {
    const t = precoPelicula(catalogo.tabela, item.linha_pelicula_id, categoriaId);
    return { preco: t?.preco_centavos ?? null, consumo: t?.consumo_metros ?? null };
  }
  const s = catalogo.servicos.find((x) => x.id === item.servico_id);
  if (!s) return { preco: null, consumo: null };
  return { preco: precoUnitarioServico(s, categoriaId), consumo: null };
}

