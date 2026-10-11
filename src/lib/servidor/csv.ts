/**
 * Geração de CSV compatível com o Excel em português (separador ";" e BOM UTF-8).
 */

export interface ColunaCSV<T> {
  titulo: string;
  valor: (linha: T) => string | number | null | undefined;
}

function escapar(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  // Evita injeção de fórmulas ao abrir no Excel
  const seguro = /^[=+\-@\t\r]/.test(texto) && !/^-?\d+([.,]\d+)?$/.test(texto) ? `'${texto}` : texto;
  return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

export function gerarCSV<T>(colunas: ColunaCSV<T>[], linhas: T[]): string {
  const cabecalho = colunas.map((c) => escapar(c.titulo)).join(";");
  const corpo = linhas.map((l) => colunas.map((c) => escapar(c.valor(l))).join(";"));
  return "﻿" + [cabecalho, ...corpo].join("\r\n") + "\r\n";
}

/** Centavos → "1234,56" (número para planilha, sem símbolo) */
export function centavosCSV(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function decimalCSV(valor: number | null | undefined, casas = 3): string {
  if (valor === null || valor === undefined) return "";
  return Number(valor).toFixed(casas).replace(".", ",");
}

export function respostaCSV(nomeArquivo: string, conteudo: string): Response {
  return new Response(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
