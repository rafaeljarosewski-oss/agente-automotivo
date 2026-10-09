/**
 * Validação e formatação de CPF e CNPJ.
 * O CNPJ alfanumérico (Instrução Normativa RFB nº 2.229/2024, emitido a partir de julho/2026)
 * também é aceito: 12 posições alfanuméricas + 2 dígitos verificadores numéricos.
 */

export function somenteDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

/** Remove máscara e deixa letras maiúsculas (serve para CPF e para CNPJ alfanumérico) */
export function normalizarDocumento(valor: string | null | undefined): string {
  return (valor ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function validarCPF(valor: string | null | undefined): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (fatorInicial: number) => {
    let soma = 0;
    for (let i = 0; i < fatorInicial - 1; i++) soma += Number(cpf[i]) * (fatorInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(10) === Number(cpf[9]) && calc(11) === Number(cpf[10]);
}

function valorCaractereCNPJ(c: string): number {
  // Tabela da Receita: valor = código ASCII - 48 ("0" = 0 ... "9" = 9, "A" = 17 ... "Z" = 42)
  return c.charCodeAt(0) - 48;
}

function calcularDVCNPJ(base: string): number {
  const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = base.split("").reduce((acc, c, i) => acc + valorCaractereCNPJ(c) * (pesos[i] ?? 0), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Completa os 2 dígitos verificadores de uma base de 12 posições */
export function completarCNPJ(base12: string): string {
  const base = normalizarDocumento(base12).slice(0, 12);
  const dv1 = calcularDVCNPJ(base);
  return `${base}${dv1}${calcularDVCNPJ(base + dv1)}`;
}

/** Completa os 2 dígitos verificadores de uma base de 9 dígitos */
export function completarCPF(base9: string): string {
  const base = somenteDigitos(base9).slice(0, 9);
  const dv = (b: string) => {
    const soma = b.split("").reduce((acc, c, i) => acc + Number(c) * (b.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const dv1 = dv(base);
  return `${base}${dv1}${dv(base + dv1)}`;
}

export function validarCNPJ(valor: string | null | undefined): boolean {
  const cnpj = normalizarDocumento(valor);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  return completarCNPJ(cnpj.slice(0, 12)) === cnpj;
}

export function validarCpfCnpj(valor: string | null | undefined): boolean {
  const doc = normalizarDocumento(valor);
  if (doc.length === 11) return validarCPF(doc);
  if (doc.length === 14) return validarCNPJ(doc);
  return false;
}

export function formatarCPF(valor: string | null | undefined): string {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function formatarCNPJ(valor: string | null | undefined): string {
  const d = normalizarDocumento(valor).slice(0, 14);
  return d
    .replace(/^([0-9A-Z]{2})([0-9A-Z])/, "$1.$2")
    .replace(/^([0-9A-Z]{2})\.([0-9A-Z]{3})([0-9A-Z])/, "$1.$2.$3")
    .replace(/\.([0-9A-Z]{3})([0-9A-Z])/, ".$1/$2")
    .replace(/([0-9A-Z]{4})(\d{1,2})$/, "$1-$2");
}

export function formatarCpfCnpj(valor: string | null | undefined): string {
  const doc = normalizarDocumento(valor);
  if (!doc) return "";
  return doc.length <= 11 && /^\d+$/.test(doc) ? formatarCPF(doc) : formatarCNPJ(doc);
}
