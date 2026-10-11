/**
 * Blocos de validação (Zod) reutilizados nos formulários e nas Server Actions.
 * Os campos de formulário chegam como texto; aqui viram valores normalizados.
 */
import { z } from "zod";

import { textoParaCentavos } from "@/lib/dominio/dinheiro";
import { normalizarDocumento, somenteDigitos, validarCNPJ, validarCPF } from "@/lib/dominio/documentos";
import { normalizarPlaca, validarPlaca } from "@/lib/dominio/placa";

/** Texto opcional: "" vira null */
export const textoOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const textoObrigatorio = (rotulo: string) => z.string({ error: `Informe ${rotulo}.` }).trim().min(1, `Informe ${rotulo}.`);

export const emailOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v.toLowerCase() : null))
  .refine((v) => v === null || z.email().safeParse(v).success, "E-mail inválido.");

export const telefoneOpcional = z
  .string()
  .optional()
  .nullable()
  .transform((v) => somenteDigitos(v) || null)
  .refine((v) => v === null || v.length === 10 || v.length === 11, "Telefone inválido. Use DDD + número.");

export const cepOpcional = z
  .string()
  .optional()
  .nullable()
  .transform((v) => somenteDigitos(v) || null)
  .refine((v) => v === null || v.length === 8, "CEP inválido.");

export const ufOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v.toUpperCase() : null))
  .refine((v) => v === null || /^[A-Z]{2}$/.test(v), "UF inválida.");

export const cpfOpcional = z
  .string()
  .optional()
  .nullable()
  .transform((v) => somenteDigitos(v) || null)
  .refine((v) => v === null || validarCPF(v), "CPF inválido.");

export const cnpjObrigatorio = z
  .string({ error: "Informe o CNPJ." })
  .transform((v) => normalizarDocumento(v))
  .refine((v) => validarCNPJ(v), "CNPJ inválido.");

export const cpfCnpjOpcional = z
  .string()
  .optional()
  .nullable()
  .transform((v) => normalizarDocumento(v) || null)
  .refine((v) => v === null || (v.length === 11 ? validarCPF(v) : validarCNPJ(v)), "CPF/CNPJ inválido.");

export const placa = z
  .string({ error: "Informe a placa." })
  .transform((v) => normalizarPlaca(v))
  .refine((v) => validarPlaca(v), "Placa inválida. Use ABC-1234 ou ABC1D23.");

/** Valor em reais digitado ("1.234,56") → centavos (inteiro) */
export const dinheiro = (rotulo = "o valor") =>
  z
    .union([z.string(), z.number()])
    .transform((v, ctx) => {
      const c = textoParaCentavos(v);
      if (c === null) {
        ctx.addIssue({ code: "custom", message: `Informe ${rotulo} em reais.` });
        return z.NEVER;
      }
      return c;
    })
    .refine((v) => v >= 0, "O valor não pode ser negativo.");

export const dinheiroOpcional = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return 0;
    const c = textoParaCentavos(v);
    if (c === null || c < 0) {
      ctx.addIssue({ code: "custom", message: "Valor inválido." });
      return z.NEVER;
    }
    return c;
  });

/** Número decimal digitado com vírgula ("2,5") */
export function paraNumero(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = v.trim().replace(/\./g, (m, i, s: string) => (s.includes(",") ? "" : m)).replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export const decimal = (rotulo: string, { min = 0, maxCasas = 3 }: { min?: number; maxCasas?: number } = {}) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const n = paraNumero(v);
    if (n === null) {
      ctx.addIssue({ code: "custom", message: `Informe ${rotulo}.` });
      return z.NEVER;
    }
    if (n < min) {
      ctx.addIssue({ code: "custom", message: `${rotulo[0]?.toUpperCase()}${rotulo.slice(1)} deve ser no mínimo ${min}.` });
      return z.NEVER;
    }
    const fator = 10 ** maxCasas;
    return Math.round(n * fator) / fator;
  });

export const decimalOpcional = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = paraNumero(v);
    if (n === null) {
      ctx.addIssue({ code: "custom", message: "Número inválido." });
      return z.NEVER;
    }
    return n;
  });

export const inteiroOpcional = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: "Informe um número inteiro." });
      return z.NEVER;
    }
    return n;
  });

export const uuid = z.uuid("Registro inválido.");
export const uuidOpcional = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.uuid().safeParse(v).success, "Registro inválido.");

export const dataISO = z
  .string({ error: "Informe a data." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
