/**
 * Placas de veículos: padrão antigo (ABC-1234) e Mercosul (ABC1D23).
 */

export function normalizarPlaca(valor: string | null | undefined): string {
  return (valor ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function placaAntiga(valor: string): boolean {
  return /^[A-Z]{3}\d{4}$/.test(normalizarPlaca(valor));
}

export function placaMercosul(valor: string): boolean {
  return /^[A-Z]{3}\d[A-Z]\d{2}$/.test(normalizarPlaca(valor));
}

export function validarPlaca(valor: string | null | undefined): boolean {
  const p = normalizarPlaca(valor);
  return placaAntiga(p) || placaMercosul(p);
}

/** ABC1234 → "ABC-1234"; ABC1D23 → "ABC1D23" */
export function formatarPlaca(valor: string | null | undefined): string {
  const p = normalizarPlaca(valor);
  if (placaAntiga(p)) return `${p.slice(0, 3)}-${p.slice(3)}`;
  return p;
}

/** Converte placa antiga para o equivalente Mercosul (2º dígito → letra) */
export function converterParaMercosul(valor: string): string {
  const p = normalizarPlaca(valor);
  if (!placaAntiga(p)) return p;
  const letra = "ABCDEFGHIJ"[Number(p[4])];
  return `${p.slice(0, 4)}${letra}${p.slice(5)}`;
}
