import { z } from "zod";

import { dataISO, inteiroOpcional, textoOpcional, uuidOpcional } from "./comum";
import { schemaItens } from "./itens";
import { schemaDescontoTotal } from "./orcamento";

export const formasPagamento = ["dinheiro", "pix", "debito", "credito_vista", "credito_parcelado", "boleto"] as const;

export const schemaOS = z
  .object({
    id: uuidOpcional,
    cliente_id: z.uuid("Escolha o cliente."),
    veiculo_id: uuidOpcional,
    instalador_id: uuidOpcional,
    previsao_entrega: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    km: inteiroOpcional,
    forma_pagamento: z
      .enum(formasPagamento)
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
    parcelas: z.coerce.number().int().min(1).max(24).default(1),
    observacoes: textoOpcional,
    observacoes_internas: textoOpcional,
    itens: schemaItens,
  })
  .and(schemaDescontoTotal);

export type OSEntrada = z.input<typeof schemaOS>;

export const schemaConclusao = z.object({
  id: z.uuid(),
  forma_pagamento: z.enum(formasPagamento).nullable(),
  parcelas: z.coerce.number().int().min(1).max(24),
  series: z.record(z.string(), z.array(z.string().trim().min(1))).default({}),
});

export type ConclusaoEntrada = z.input<typeof schemaConclusao>;

export { dataISO };
