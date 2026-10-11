/** Normaliza texto para busca: minúsculas e sem acentos (mesma regra da função normalizar_busca do banco) */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[%_,()]/g, " ");
}
