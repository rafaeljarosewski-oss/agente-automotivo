import { z } from "zod";

import { dataISO, decimal, dinheiroOpcional, textoOpcional, uuidOpcional } from "./comum";
import { schemaItens } from "./itens";

export const schemaDescontoTotal = z.discriminatedUnion("desconto_tipo", [
  z.object({ desconto_tipo: z.literal("valor"), desconto_valor: dinheiroOpcional }),
  z.object({ desconto_tipo: z.literal("percentual"), desconto_valor: decimal("o percentual de desconto", { maxCasas: 2 }).refine((v) => v <= 100, "Máximo de 100%.") }),
]);

export const schemaOrcamento = z
  .object({
    id: uuidOpcional,
    cliente_id: z.uuid("Escolha o cliente."),
    veiculo_id: uuidOpcional,
    validade: dataISO,
    observacoes: textoOpcional,
    itens: schemaItens,
  })
  .and(schemaDescontoTotal);

export type OrcamentoEntrada = z.input<typeof schemaOrcamento>;
