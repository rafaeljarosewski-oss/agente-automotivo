import { calcularItem, descontoPercentual } from "@/lib/dominio/calculos";

/** Converte o desconto no total (valor ou %) em centavos, sobre o líquido dos itens */
export function descontoTotalEmCentavos(
  itens: { quantidade: number; preco_unitario_centavos: number; desconto_centavos?: number }[],
  tipo: "valor" | "percentual",
  valor: number,
): number {
  if (tipo === "valor") return valor;
  const liquido = itens.reduce((s, i) => s + calcularItem(i).total_centavos, 0);
  return descontoPercentual(liquido, valor);
}
