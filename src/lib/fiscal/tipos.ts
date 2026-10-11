/**
 * Contrato da camada fiscal. O resto do sistema só conhece estes tipos e a interface
 * FiscalProvider — trocar de API (ACBr, Nuvem Fiscal, Focus NFe...) é escrever outra implementação.
 */

export type TipoDocumento = "nfse" | "nfce" | "nfe";
export type Ambiente = "homologacao" | "producao";
export type StatusDocumento = "processando" | "autorizada" | "rejeitada" | "cancelada" | "erro";
export type RegimeTributario = "simples_nacional" | "simples_excesso" | "normal" | "mei";
export type FormaPagamentoFiscal = "dinheiro" | "pix" | "debito" | "credito_vista" | "credito_parcelado" | "boleto" | "outros";

export interface EnderecoFiscal {
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string; // só dígitos
  codigo_municipio: string; // IBGE 7 dígitos
}

export interface EmitenteFiscal {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  regime: RegimeTributario;
  cnae?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco: EnderecoFiscal;
}

export interface DestinatarioFiscal {
  tipo_pessoa: "PF" | "PJ";
  cpf_cnpj?: string | null;
  nome: string;
  inscricao_estadual?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: EnderecoFiscal | null;
}

export interface ItemFiscal {
  numero: number;
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario_centavos: number;
  valor_bruto_centavos: number; // quantidade × unitário
  desconto_centavos: number; // desconto do item + rateio do desconto no total
  // produto
  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  origem?: number | null;
  csosn?: string | null;
  cst_icms?: string | null;
  aliquota_icms?: number | null;
  cst_pis?: string | null;
  cst_cofins?: string | null;
  codigo_barras?: string | null;
  // serviço
  codigo_servico?: string | null; // item LC 116 / cTribNac
  codigo_tributacao_municipal?: string | null;
  codigo_nbs?: string | null;
  aliquota_iss?: number | null;
  // reforma tributária
  cst_ibs_cbs?: string | null;
  cclass_trib?: string | null;
}

export interface PagamentoFiscal {
  forma: FormaPagamentoFiscal;
  valor_centavos: number;
}

export interface ConfigIbsCbs {
  informar: boolean;
  aliquota_ibs_uf: number;
  aliquota_ibs_mun: number;
  aliquota_cbs: number;
}

export interface PedidoEmissao {
  tipo: TipoDocumento;
  ambiente: Ambiente;
  referencia: string; // idempotência
  serie: string;
  numero: number;
  data_emissao: string; // ISO com fuso
  emitente: EmitenteFiscal;
  destinatario: DestinatarioFiscal | null;
  itens: ItemFiscal[];
  pagamentos: PagamentoFiscal[];
  informacoes_adicionais?: string | null;
  natureza_operacao: string;
  nfse_provedor?: "nacional" | "padrao";
  nfse_regime_especial?: number | null;
  ibscbs: ConfigIbsCbs;
  responsavel_tecnico?: { cnpj: string; contato: string; email: string; telefone: string } | null;
}

export interface MensagemFiscal {
  codigo?: string | null;
  descricao: string;
  correcao?: string | null;
}

export interface RespostaDocumento {
  provedor_id: string;
  status: StatusDocumento;
  numero?: string | null;
  serie?: string | null;
  chave?: string | null;
  protocolo?: string | null;
  codigo_verificacao?: string | null;
  link_url?: string | null;
  data_emissao?: string | null;
  codigo_status?: string | null;
  motivo_status?: string | null;
  mensagens: MensagemFiscal[];
  bruto?: unknown;
}

export interface RespostaEvento {
  provedor_id?: string | null;
  status: "pendente" | "registrado" | "rejeitado" | "erro";
  protocolo?: string | null;
  mensagem?: string | null;
  bruto?: unknown;
}

export interface InfoCertificado {
  titular?: string | null;
  serial?: string | null;
  validade?: string | null; // ISO
  emissor?: string | null;
}

export interface MetadadosMunicipio {
  codigo_ibge: string;
  municipio?: string | null;
  uf?: string | null;
  provedor?: string | null;
  nacional: boolean;
  ambientes: Ambiente[];
}

export interface ConfiguracaoEmpresaFiscal {
  ambiente: Ambiente;
  regime: RegimeTributario;
  nfse?: { serie: string; proximo_numero: number; regime_especial?: number | null; incentivo_fiscal?: boolean };
  nfce?: { serie: number; proximo_numero: number; csc_id: number; csc: string };
  nfe?: { serie: number; proximo_numero: number };
}

/** Webhook recebido e já interpretado */
export interface EventoWebhook {
  tipo: TipoDocumento;
  provedor_id: string;
}

export class ErroFiscal extends Error {
  constructor(
    mensagem: string,
    public readonly mensagens: MensagemFiscal[] = [],
    public readonly status?: number,
  ) {
    super(mensagem);
    this.name = "ErroFiscal";
  }
}

export interface FiscalProvider {
  readonly nome: string;
  /** Cadastra/atualiza a empresa emitente na API fiscal */
  registrarEmpresa(emitente: EmitenteFiscal): Promise<void>;
  /** Atualiza configurações de emissão (ambiente, séries, CSC) */
  configurarEmpresa(cnpj: string, config: ConfiguracaoEmpresaFiscal): Promise<void>;
  /** Envia o certificado A1 direto para a API (nunca é armazenado no nosso banco) */
  enviarCertificado(cnpj: string, arquivo: Uint8Array, senha: string): Promise<InfoCertificado>;
  /** Consulta se o município usa o padrão nacional da NFS-e */
  consultarMunicipio(codigoIbge: string): Promise<MetadadosMunicipio | null>;
  emitir(pedido: PedidoEmissao): Promise<RespostaDocumento>;
  consultar(tipo: TipoDocumento, provedorId: string): Promise<RespostaDocumento>;
  baixarXml(tipo: TipoDocumento, provedorId: string): Promise<Uint8Array>;
  baixarPdf(tipo: TipoDocumento, provedorId: string): Promise<Uint8Array>;
  cancelar(tipo: TipoDocumento, provedorId: string, justificativa: string): Promise<RespostaEvento>;
  cartaCorrecao(provedorId: string, correcao: string): Promise<RespostaEvento>;
  baixarPdfCartaCorrecao(provedorId: string): Promise<Uint8Array>;
  /** Interpreta o corpo de um webhook (já com assinatura validada) */
  interpretarWebhook(corpo: unknown): EventoWebhook | null;
}
