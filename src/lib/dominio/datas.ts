/**
 * Datas no padrão brasileiro (dd/mm/aaaa). O fuso de referência é America/Sao_Paulo.
 */

export const FUSO = "America/Sao_Paulo";

const fmtData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function paraDate(valor: string | Date): Date {
  if (valor instanceof Date) return valor;
  // "2026-10-09" (data pura) é tratada como meio-dia para não "voltar um dia" por causa do fuso
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return new Date(`${valor}T12:00:00-03:00`);
  return new Date(valor);
}

export function formatarData(valor: string | Date | null | undefined): string {
  if (!valor) return "";
  const d = paraDate(valor);
  return Number.isNaN(d.getTime()) ? "" : fmtData.format(d);
}

export function formatarDataHora(valor: string | Date | null | undefined): string {
  if (!valor) return "";
  const d = paraDate(valor);
  return Number.isNaN(d.getTime()) ? "" : fmtDataHora.format(d).replace(",", "");
}

/** Data de hoje (fuso de Brasília) no formato ISO aaaa-mm-dd */
export function hojeISO(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
  return partes; // en-CA já usa aaaa-mm-dd
}

/** "09/10/2026" → "2026-10-09" (null se inválida) */
export function dataBrParaISO(valor: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  const iso = `${aaaa}-${mm}-${dd}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return d.getUTCDate() === Number(dd) && d.getUTCMonth() + 1 === Number(mm) ? iso : null;
}

/** Soma dias a uma data ISO (aaaa-mm-dd) */
export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Soma meses a uma data ISO mantendo o dia; se o mês não tiver o dia (ex.: 31/02),
 * usa o último dia do mês.
 */
export function somarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1, 12));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0, 12)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimoDia));
  return alvo.toISOString().slice(0, 10);
}

export function primeiroDiaDoMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}
