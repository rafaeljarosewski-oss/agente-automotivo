/**
 * Dinheiro é SEMPRE guardado em centavos (inteiro). Nunca use float para somar valores.
 */

const formatador = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 123456 → "R$ 1.234,56" */
export function formatarMoeda(centavos: number | bigint | null | undefined): string {
  const valor = Number(centavos ?? 0) / 100;
  return formatador.format(valor).replace(/ /g, " ");
}

/** 123456 → "1.234,56" (sem o símbolo, para campos de formulário) */
export function centavosParaTexto(centavos: number | null | undefined): string {
  const valor = Number(centavos ?? 0) / 100;
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converte o texto digitado pelo usuário em centavos.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 10", "10".
 * Retorna null quando não for um número válido.
 */
export function textoParaCentavos(texto: string | number | null | undefined): number | null {
  if (texto === null || texto === undefined) return null;
  if (typeof texto === "number") return Number.isFinite(texto) ? Math.round(texto * 100) : null;
  let t = texto.replace(/[R$\s]/g, "").trim();
  if (!t) return null;
  const negativo = t.startsWith("-");
  t = t.replace(/^-/, "");
  if (t.includes(",")) {
    // padrão brasileiro: ponto como milhar, vírgula como decimal
    t = t.replace(/\./g, "").replace(",", ".");
  } else if ((t.match(/\./g) ?? []).length > 1) {
    t = t.replace(/\./g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [inteiro, decimal = ""] = t.split(".");
  const dec = (decimal + "00").slice(0, 3);
  // arredondamento comercial na terceira casa
  let centavos = Number(inteiro) * 100 + Number(dec.slice(0, 2));
  if (Number(dec[2]) >= 5) centavos += 1;
  return negativo ? -centavos : centavos;
}

/**
 * Multiplica um valor em centavos por uma quantidade (que pode ser fracionária, ex.: 2,5 m²)
 * e arredonda para o centavo mais próximo (meio para cima).
 */
export function multiplicarCentavos(centavos: number, quantidade: number): number {
  // Evita erros de ponto flutuante (ex.: 1.005) trabalhando com 6 casas
  const resultado = Math.round(centavos * Math.round(quantidade * 1_000_000)) / 1_000_000;
  return arredondar(resultado);
}

/** Aplica um percentual (ex.: 10 = 10%) sobre um valor em centavos */
export function percentualDe(centavos: number, percentual: number): number {
  return arredondar((centavos * Math.round(percentual * 10_000)) / 1_000_000);
}

/** Arredondamento meio-para-cima, simétrico para negativos */
export function arredondar(valor: number): number {
  const sinal = valor < 0 ? -1 : 1;
  return sinal * Math.round(Math.abs(valor) + Number.EPSILON);
}

/**
 * Divide um valor em N partes inteiras cuja soma é exatamente o total.
 * A diferença de centavos vai para as primeiras partes.
 * Ex.: 1000 em 3 → [334, 333, 333]
 */
export function dividirCentavos(total: number, partes: number): number[] {
  if (!Number.isInteger(total)) throw new Error("O total deve estar em centavos (inteiro).");
  if (!Number.isInteger(partes) || partes < 1) throw new Error("Número de partes inválido.");
  const base = Math.floor(total / partes);
  const resto = total - base * partes;
  return Array.from({ length: partes }, (_, i) => base + (i < resto ? 1 : 0));
}

/**
 * Rateia um valor (ex.: desconto no total) proporcionalmente aos pesos (ex.: valor de cada item).
 * A soma do resultado é exatamente igual ao valor rateado.
 */
export function ratear(valor: number, pesos: number[]): number[] {
  if (pesos.length === 0) return [];
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  if (somaPesos <= 0) return dividirCentavos(valor, pesos.length);
  const brutos = pesos.map((p) => (valor * p) / somaPesos);
  const resultado = brutos.map((b) => Math.floor(b));
  let restante = valor - resultado.reduce((a, b) => a + b, 0);
  // distribui o que sobrou para as maiores frações
  const ordem = brutos
    .map((b, i) => ({ i, fracao: b - Math.floor(b) }))
    .sort((a, b) => b.fracao - a.fracao || a.i - b.i);
  for (const { i } of ordem) {
    if (restante <= 0) break;
    resultado[i] = (resultado[i] ?? 0) + 1;
    restante--;
  }
  return resultado;
}
