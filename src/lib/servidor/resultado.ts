/** Resultado padrão das Server Actions (serializável para o cliente) */
export type Resultado<T = undefined> =
  | { ok: true; dados: T; mensagem?: string }
  | { ok: false; erro: string; campos?: Record<string, string> };

export function sucesso<T>(dados: T, mensagem?: string): Resultado<T> {
  return { ok: true, dados, mensagem };
}

export function falha(erro: string, campos?: Record<string, string>): { ok: false; erro: string; campos?: Record<string, string> } {
  return { ok: false, erro, campos };
}
