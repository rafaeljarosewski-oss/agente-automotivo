import { z } from "zod";

import { somenteDigitos } from "@/lib/dominio/documentos";
import { decimal, decimalOpcional, dinheiro, dinheiroOpcional, inteiroOpcional, textoObrigatorio, textoOpcional, uuidOpcional } from "./comum";

const ncm = z
  .string()
  .optional()
  .nullable()
  .transform((v) => somenteDigitos(v) || null)
  .refine((v) => v === null || v.length === 8, "O NCM tem 8 dígitos.");

const cfop = z
  .string()
  .optional()
  .nullable()
  .transform((v) => somenteDigitos(v) || null)
  .refine((v) => v === null || v.length === 4, "O CFOP tem 4 dígitos.");

const codigoCurto = (tamanhos: number[], rotulo: string) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((v) => somenteDigitos(v) || null)
    .refine((v) => v === null || tamanhos.includes(v.length), `${rotulo} inválido.`);

export const schemaProduto = z
  .object({
    id: uuidOpcional,
    codigo: textoOpcional,
    codigo_barras: textoOpcional,
    nome: textoObrigatorio("o nome"),
    descricao: textoOpcional,
    categoria: z.enum(["pelicula", "lampada", "alarme", "acessorio", "ar_condicionado", "som", "outro"]),
    marca: textoOpcional,
    tipo_controle: z.enum(["unidade", "metro"]),
    unidade: textoObrigatorio("a unidade").transform((v) => v.toUpperCase()),
    exige_numero_serie: z.boolean(),
    preco_venda_centavos: dinheiro("o preço de venda"),
    custo_centavos: dinheiroOpcional,
    estoque_minimo: decimal("o estoque mínimo"),
    largura_rolo_m: decimalOpcional,
    garantia_dias: inteiroOpcional,
    ativo: z.boolean(),
    ncm,
    cest: codigoCurto([7], "CEST"),
    cfop,
    origem: z.coerce.number().int().min(0).max(8),
    csosn: codigoCurto([3], "CSOSN"),
    cst_icms: codigoCurto([2], "CST de ICMS"),
    aliquota_icms: decimalOpcional,
    cst_pis: codigoCurto([2], "CST de PIS"),
    cst_cofins: codigoCurto([2], "CST de COFINS"),
    cst_ibs_cbs: codigoCurto([3], "CST de IBS/CBS"),
    cclass_trib: codigoCurto([6], "cClassTrib"),
    fiscal_validado: z.boolean(),
  })
  .refine((p) => !p.exige_numero_serie || p.tipo_controle === "unidade", {
    path: ["exige_numero_serie"],
    message: "Número de série só vale para produtos controlados por unidade.",
  })
  .refine((p) => p.tipo_controle !== "metro" || (p.largura_rolo_m ?? 0) > 0, {
    path: ["largura_rolo_m"],
    message: "Informe a largura do rolo em metros (ex.: 1,52).",
  });

export type ProdutoEntrada = z.input<typeof schemaProduto>;

export const schemaServico = z
  .object({
    id: uuidOpcional,
    codigo: textoOpcional,
    nome: textoObrigatorio("o nome"),
    descricao: textoOpcional,
    categoria: z.enum(["pelicula_automotiva", "pelicula_residencial", "instalacao", "ar_condicionado", "eletrica", "estetica", "outro"]),
    tipo_preco: z.enum(["fixo", "categoria", "m2", "pelicula"]),
    preco_centavos: dinheiroOpcional,
    precos_categoria: z.record(z.string(), z.union([z.string(), z.number()]).optional().nullable()).default({}),
    produto_consumo_id: uuidOpcional,
    perda_percentual: decimal("a perda (%)"),
    comissao_tipo: z.enum(["nenhuma", "percentual", "fixo"]),
    comissao_percentual: decimal("o percentual de comissão", { maxCasas: 2 }).refine((v) => v <= 100, "Máximo de 100%."),
    comissao_fixo_centavos: dinheiroOpcional,
    tempo_estimado_min: inteiroOpcional,
    garantia_dias: inteiroOpcional,
    ativo: z.boolean(),
    codigo_servico: textoOpcional,
    codigo_tributacao_municipal: textoOpcional,
    codigo_nbs: textoOpcional,
    aliquota_iss: decimalOpcional,
    cst_ibs_cbs: codigoCurto([3], "CST de IBS/CBS"),
    cclass_trib: codigoCurto([6], "cClassTrib"),
    fiscal_validado: z.boolean(),
  })
  .refine((s) => s.tipo_preco !== "m2" || s.preco_centavos > 0, { path: ["preco_centavos"], message: "Informe o preço por m²." });

export type ServicoEntrada = z.input<typeof schemaServico>;

export const schemaLinhaPelicula = z.object({
  id: uuidOpcional,
  nome: textoObrigatorio("o nome da linha"),
  marca: textoOpcional,
  descricao: textoOpcional,
  produto_id: uuidOpcional,
  servico_id: uuidOpcional,
  ordem: z.coerce.number().int().default(0),
  ativo: z.boolean().default(true),
});

export type LinhaPeliculaEntrada = z.input<typeof schemaLinhaPelicula>;

export const schemaCelulaTabela = z.object({
  linha_id: z.uuid(),
  categoria_id: z.uuid(),
  preco_centavos: dinheiroOpcional,
  consumo_metros: decimal("o consumo (m)"),
});

export type CelulaTabelaEntrada = z.input<typeof schemaCelulaTabela>;
