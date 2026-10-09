import { z } from "zod";

import { normalizarDocumento, validarCNPJ, validarCPF } from "@/lib/dominio/documentos";
import {
  cepOpcional,
  emailOpcional,
  inteiroOpcional,
  placa,
  telefoneOpcional,
  textoObrigatorio,
  textoOpcional,
  ufOpcional,
  uuidOpcional,
} from "./comum";

export const schemaCliente = z
  .object({
    id: uuidOpcional,
    tipo_pessoa: z.enum(["PF", "PJ"]),
    nome: textoObrigatorio("o nome"),
    nome_fantasia: textoOpcional,
    cpf_cnpj: z
      .string()
      .optional()
      .nullable()
      .transform((v) => normalizarDocumento(v) || null),
    inscricao_estadual: textoOpcional,
    email: emailOpcional,
    telefone: telefoneOpcional,
    whatsapp: telefoneOpcional,
    data_nascimento: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    cep: cepOpcional,
    logradouro: textoOpcional,
    numero: textoOpcional,
    complemento: textoOpcional,
    bairro: textoOpcional,
    cidade: textoOpcional,
    uf: ufOpcional,
    codigo_municipio: textoOpcional,
    observacoes: textoOpcional,
    aceita_mensagens: z.boolean().default(true),
  })
  .superRefine((c, ctx) => {
    if (!c.cpf_cnpj) return;
    if (c.tipo_pessoa === "PF" && !validarCPF(c.cpf_cnpj)) ctx.addIssue({ code: "custom", path: ["cpf_cnpj"], message: "CPF inválido." });
    if (c.tipo_pessoa === "PJ" && !validarCNPJ(c.cpf_cnpj)) ctx.addIssue({ code: "custom", path: ["cpf_cnpj"], message: "CNPJ inválido." });
  })
  .refine((c) => c.telefone || c.whatsapp || c.email, { path: ["whatsapp"], message: "Informe pelo menos um contato (WhatsApp, telefone ou e-mail)." });

export type ClienteEntrada = z.input<typeof schemaCliente>;

const anoAtual = new Date().getFullYear();

export const schemaVeiculo = z.object({
  id: uuidOpcional,
  cliente_id: z.uuid(),
  placa,
  marca: textoOpcional,
  modelo: textoObrigatorio("o modelo"),
  ano_fabricacao: inteiroOpcional.refine((v) => v === null || (v >= 1950 && v <= anoAtual + 1), "Ano inválido."),
  ano_modelo: inteiroOpcional.refine((v) => v === null || (v >= 1950 && v <= anoAtual + 2), "Ano inválido."),
  cor: textoOpcional,
  categoria_id: uuidOpcional,
  chassi: textoOpcional,
  observacoes: textoOpcional,
});

export type VeiculoEntrada = z.input<typeof schemaVeiculo>;
