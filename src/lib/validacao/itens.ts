import { z } from "zod";

import { decimal, decimalOpcional, dinheiro, dinheiroOpcional, textoObrigatorio, uuidOpcional } from "./comum";

export const schemaMedida = z.object({
  descricao: z.string().optional().nullable(),
  largura_m: decimal("a largura", { maxCasas: 3 }).refine((v) => v > 0, "Informe a largura."),
  altura_m: decimal("a altura", { maxCasas: 3 }).refine((v) => v > 0, "Informe a altura."),
  quantidade: z.coerce.number().int().min(1, "Quantidade mínima: 1."),
});

export const schemaItem = z
  .object({
    id: uuidOpcional,
    tipo: z.enum(["servico", "produto"]),
    servico_id: uuidOpcional,
    produto_id: uuidOpcional,
    linha_pelicula_id: uuidOpcional,
    descricao: textoObrigatorio("a descrição do item"),
    quantidade: decimal("a quantidade").refine((v) => v > 0, "A quantidade deve ser maior que zero."),
    unidade: z.string().trim().min(1).default("UN"),
    preco_unitario_centavos: dinheiro("o preço"),
    desconto_centavos: dinheiroOpcional,
    medidas: z.array(schemaMedida).optional().nullable(),
    consumo_metros: decimalOpcional,
    instalador_id: uuidOpcional,
    numeros_serie: z.array(z.string().trim().min(1)).default([]),
  })
  .refine((i) => (i.tipo === "servico" ? Boolean(i.servico_id) : Boolean(i.produto_id)), {
    message: "Item sem serviço/produto vinculado.",
  });

export type ItemEntrada = z.input<typeof schemaItem>;
export type ItemValidado = z.output<typeof schemaItem>;

export const schemaItens = z.array(schemaItem).min(1, "Adicione pelo menos um item.");
