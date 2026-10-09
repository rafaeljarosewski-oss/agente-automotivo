/**
 * Leitura do XML da NF-e de compra (layout 4.00 — nfeProc ou NFe) para entrada no estoque.
 */
import { XMLParser } from "fast-xml-parser";

import { normalizarBusca } from "@/lib/dominio/texto";

export interface ItemNFeCompra {
  numero: number;
  codigo: string;
  ean: string | null;
  descricao: string;
  ncm: string | null;
  cfop: string | null;
  unidade: string;
  quantidade: number;
  valor_unitario_centavos: number;
  valor_total_centavos: number;
}

export interface NFeCompra {
  chave: string | null;
  numero: string;
  serie: string;
  data_emissao: string | null;
  fornecedor: { cnpj: string; nome: string; fantasia: string | null };
  destinatario_cnpj: string | null;
  valor_total_centavos: number;
  itens: ItemNFeCompra[];
  duplicatas: { numero: string; vencimento: string; valor_centavos: number }[];
}

const lista = <T>(v: T | T[] | undefined | null): T[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const texto = (v: unknown): string => (v === undefined || v === null ? "" : String(v)).trim();
const centavos = (v: unknown): number => Math.round(Number(texto(v) || 0) * 100);

export class ErroXml extends Error {}

export function lerNFe(xml: string): NFeCompra {
  if (!xml || !xml.includes("<")) throw new ErroXml("O arquivo não é um XML.");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", removeNSPrefix: true, parseTagValue: false, trimValues: true });
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new ErroXml("XML inválido ou corrompido.");
  }
  const raiz = (doc.nfeProc as Record<string, unknown> | undefined)?.NFe ?? doc.NFe;
  const inf = (raiz as Record<string, unknown> | undefined)?.infNFe as Record<string, unknown> | undefined;
  if (!inf) throw new ErroXml("Este XML não é de uma NF-e (modelo 55).");

  const ide = (inf.ide ?? {}) as Record<string, unknown>;
  const emit = (inf.emit ?? {}) as Record<string, unknown>;
  const dest = (inf.dest ?? {}) as Record<string, unknown>;
  const total = ((inf.total as Record<string, unknown>)?.ICMSTot ?? {}) as Record<string, unknown>;
  const id = texto(inf["@Id"]);
  const chaveProt = texto((((doc.nfeProc as Record<string, unknown>)?.protNFe as Record<string, unknown>)?.infProt as Record<string, unknown>)?.chNFe);
  const chave = chaveProt || (id.startsWith("NFe") ? id.slice(3) : id) || null;

  const itens = lista(inf.det as Record<string, unknown> | Record<string, unknown>[]).map((d, i) => {
    const p = (d.prod ?? {}) as Record<string, unknown>;
    const ean = texto(p.cEAN);
    return {
      numero: Number(texto(d["@nItem"])) || i + 1,
      codigo: texto(p.cProd),
      ean: ean && ean !== "SEM GTIN" ? ean : null,
      descricao: texto(p.xProd),
      ncm: texto(p.NCM) || null,
      cfop: texto(p.CFOP) || null,
      unidade: texto(p.uCom).toUpperCase() || "UN",
      quantidade: Number(texto(p.qCom) || 0),
      valor_unitario_centavos: centavos(p.vUnCom),
      valor_total_centavos: centavos(p.vProd),
    };
  });
  if (itens.length === 0) throw new ErroXml("A nota não tem itens.");

  const cobr = (inf.cobr ?? {}) as Record<string, unknown>;
  const duplicatas = lista(cobr.dup as Record<string, unknown> | Record<string, unknown>[]).map((d) => ({
    numero: texto(d.nDup),
    vencimento: texto(d.dVenc),
    valor_centavos: centavos(d.vDup),
  }));

  return {
    chave,
    numero: texto(ide.nNF),
    serie: texto(ide.serie),
    data_emissao: texto(ide.dhEmi) || texto(ide.dEmi) || null,
    fornecedor: { cnpj: texto(emit.CNPJ) || texto(emit.CPF), nome: texto(emit.xNome), fantasia: texto(emit.xFant) || null },
    destinatario_cnpj: texto(dest.CNPJ) || texto(dest.CPF) || null,
    valor_total_centavos: centavos(total.vNF),
    itens,
    duplicatas,
  };
}

export interface ProdutoParaCasar {
  id: string;
  nome: string;
  codigo: string | null;
  codigo_barras: string | null;
}

export interface Casamento {
  numero: number;
  produto_id: string | null;
  criterio: "codigo_fornecedor" | "codigo_barras" | "codigo" | "descricao" | null;
}

function palavras(t: string): Set<string> {
  return new Set(normalizarBusca(t).split(/[^a-z0-9]+/).filter((p) => p.length >= 2));
}

/** Similaridade simples (Jaccard) entre descrições */
export function similaridade(a: string, b: string): number {
  const pa = palavras(a);
  const pb = palavras(b);
  if (!pa.size || !pb.size) return 0;
  let comum = 0;
  for (const p of pa) if (pb.has(p)) comum++;
  return comum / (pa.size + pb.size - comum);
}

/**
 * Casa os itens da nota com os produtos cadastrados, nesta ordem:
 * 1) código do fornecedor já vinculado; 2) código de barras (EAN); 3) mesmo código interno; 4) descrição parecida (≥ 50%).
 */
export function casarItens(
  itens: ItemNFeCompra[],
  produtos: ProdutoParaCasar[],
  codigosFornecedor: { produto_id: string; codigo_fornecedor: string }[],
): Casamento[] {
  return itens.map((item) => {
    const porFornecedor = codigosFornecedor.find((c) => c.codigo_fornecedor === item.codigo);
    if (porFornecedor) return { numero: item.numero, produto_id: porFornecedor.produto_id, criterio: "codigo_fornecedor" };
    if (item.ean) {
      const p = produtos.find((x) => x.codigo_barras === item.ean);
      if (p) return { numero: item.numero, produto_id: p.id, criterio: "codigo_barras" };
    }
    const porCodigo = produtos.find((x) => x.codigo && x.codigo === item.codigo);
    if (porCodigo) return { numero: item.numero, produto_id: porCodigo.id, criterio: "codigo" };
    let melhor: { id: string; s: number } | null = null;
    for (const p of produtos) {
      const s = similaridade(item.descricao, p.nome);
      if (s >= 0.5 && (!melhor || s > melhor.s)) melhor = { id: p.id, s };
    }
    return melhor ? { numero: item.numero, produto_id: melhor.id, criterio: "descricao" } : { numero: item.numero, produto_id: null, criterio: null };
  });
}
