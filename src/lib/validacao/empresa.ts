import { z } from "zod";

import { cepOpcional, cnpjObrigatorio, emailOpcional, telefoneOpcional, textoObrigatorio, textoOpcional, ufOpcional } from "./comum";

export const schemaEmpresa = z.object({
  razao_social: textoObrigatorio("a razão social"),
  nome_fantasia: textoOpcional,
  cnpj: cnpjObrigatorio,
  inscricao_estadual: textoOpcional,
  inscricao_municipal: textoOpcional,
  regime_tributario: z.enum(["simples_nacional", "simples_excesso", "normal", "mei"]),
  cnae: textoOpcional,
  email: emailOpcional,
  telefone: telefoneOpcional,
  whatsapp: telefoneOpcional,
  cep: cepOpcional,
  logradouro: textoOpcional,
  numero: textoOpcional,
  complemento: textoOpcional,
  bairro: textoOpcional,
  cidade: textoOpcional,
  uf: ufOpcional,
  codigo_municipio: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v.replace(/\D/g, "") : null))
    .refine((v) => v === null || v.length === 7, "O código IBGE tem 7 dígitos."),
});

export type EmpresaEntrada = z.input<typeof schemaEmpresa>;
