/** Rótulos em português para os valores enumerados do banco */

export const ROTULO_PAPEL = { admin: "Administrador", atendente: "Atendente", instalador: "Instalador" } as const;

export const ROTULO_STATUS_ORCAMENTO = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
} as const;

export const ROTULO_STATUS_OS = {
  aberta: "Aberta",
  em_execucao: "Em execução",
  aguardando_peca: "Aguardando peça",
  concluida: "Concluída",
  entregue: "Entregue",
  cancelada: "Cancelada",
} as const;

export const ROTULO_FORMA_PAGAMENTO = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Cartão de débito",
  credito_vista: "Crédito à vista",
  credito_parcelado: "Crédito parcelado",
  boleto: "Boleto",
} as const;

export const ROTULO_TIPO_NOTA = { nfse: "NFS-e", nfce: "NFC-e", nfe: "NF-e" } as const;

export const ROTULO_STATUS_NOTA = {
  rascunho: "Rascunho",
  processando: "Em processamento",
  autorizada: "Autorizada",
  rejeitada: "Rejeitada",
  cancelada: "Cancelada",
  erro: "Erro no envio",
} as const;

export const ROTULO_STATUS_TITULO = { aberto: "Em aberto", pago: "Pago", cancelado: "Cancelado" } as const;

export const ROTULO_REGIME = {
  simples_nacional: "Simples Nacional",
  simples_excesso: "Simples Nacional — excesso de sublimite",
  normal: "Regime Normal (Lucro Presumido/Real)",
  mei: "MEI",
} as const;

export const ROTULO_TIPO_PRECO = {
  fixo: "Preço fixo",
  categoria: "Por categoria de veículo",
  m2: "Por m²",
  pelicula: "Tabela de película (linha × categoria)",
} as const;

export const ROTULO_CATEGORIA_PRODUTO = {
  pelicula: "Película",
  lampada: "Lâmpada",
  alarme: "Alarme",
  acessorio: "Acessório",
  ar_condicionado: "Ar-condicionado",
  som: "Som e multimídia",
  outro: "Outro",
} as const;

export const ROTULO_CATEGORIA_SERVICO = {
  pelicula_automotiva: "Película automotiva",
  pelicula_residencial: "Película residencial",
  instalacao: "Instalação",
  ar_condicionado: "Ar-condicionado",
  eletrica: "Elétrica",
  estetica: "Estética",
  outro: "Outro",
} as const;

export const ROTULO_TIPO_MOVIMENTO = { entrada: "Entrada", saida: "Saída", ajuste: "Ajuste" } as const;

export function rotulo<T extends Record<string, string>>(mapa: T, valor: string | null | undefined): string {
  if (!valor) return "";
  return (mapa as Record<string, string>)[valor] ?? valor;
}
