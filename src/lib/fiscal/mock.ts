/**
 * FiscalProviderMock — simula a API fiscal para desenvolver e testar sem credenciais.
 *
 * Regras da simulação:
 *  - Toda nota entra "em processamento" e é autorizada após alguns segundos (MOCK_FISCAL_ATRASO_MS, padrão 1500 ms).
 *  - É REJEITADA quando: algum item tem "[REJEITAR]" na descrição (rejeição genérica), algum produto tem NCM
 *    "00000000" (NCM inexistente) ou o CPF/CNPJ do cliente é inválido.
 *  - Não guarda estado: tudo o que precisa fica codificado no ID do documento, então funciona entre requisições
 *    e instâncias diferentes do servidor.
 *  - Se MOCK_FISCAL_WEBHOOK_URL estiver definido, envia um webhook assinado quando a nota "termina".
 */
import { validarCpfCnpj } from "@/lib/dominio/documentos";
import { assinarWebhook, CABECALHO_ASSINATURA } from "./assinatura";
import { CODIGO_UF, validarPedido } from "./mapeamento";
import { ErroFiscal } from "./tipos";
import type {
  ConfiguracaoEmpresaFiscal,
  EmitenteFiscal,
  EventoWebhook,
  FiscalProvider,
  InfoCertificado,
  MensagemFiscal,
  MetadadosMunicipio,
  PedidoEmissao,
  RespostaDocumento,
  RespostaEvento,
  TipoDocumento,
} from "./tipos";

export interface EstadoMock {
  t: TipoDocumento;
  ts: number;
  n: number;
  s: string;
  cnpj: string;
  uf: string;
  amb: "homologacao" | "producao";
  v: number; // valor em centavos
  rej?: { c: string; m: string };
}

export function codificar(estado: EstadoMock): string {
  return `mock_${estado.t}_${Buffer.from(JSON.stringify(estado)).toString("base64url")}`;
}

function decodificar(id: string): EstadoMock {
  const m = /^mock_(nfse|nfce|nfe)_(.+)$/.exec(id);
  if (!m) throw new Error("Documento não encontrado no emissor simulado.");
  return JSON.parse(Buffer.from(m[2]!, "base64url").toString("utf8")) as EstadoMock;
}

/** Dígito verificador da chave de acesso (módulo 11) */
export function dvChave(chave43: string): number {
  let peso = 2;
  let soma = 0;
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += Number(chave43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function chaveAcesso(e: EstadoMock): string {
  const d = new Date(e.ts);
  const aamm = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
  const cnpjNum = e.cnpj.replace(/\D/g, "").padStart(14, "0").slice(-14);
  const base =
    String(CODIGO_UF[e.uf] ?? 43) +
    aamm +
    cnpjNum +
    (e.t === "nfce" ? "65" : "55") +
    e.s.padStart(3, "0").slice(-3) +
    String(e.n).padStart(9, "0") +
    "1" +
    String(e.n * 7919).padStart(8, "0").slice(-8);
  return base + dvChave(base);
}

/** PDF mínimo (uma página, Helvetica) — usado como DANFE/DANFSE simulado */
export function pdfSimples(linhas: string[]): Uint8Array {
  const escapar = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\x20-\x7e]/g, "?")
      .replace(/([()\\])/g, "\\$1");
  const conteudo = [
    "BT",
    "/F1 16 Tf",
    "50 790 Td",
    ...linhas.flatMap((l, i) => [i === 1 ? "/F1 11 Tf" : "", `(${escapar(l)}) Tj`, "0 -20 Td"]).filter(Boolean),
    "ET",
  ].join("\n");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(conteudo)} >>\nstream\n${conteudo}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, "latin1"));
}

export class MockFiscalProvider implements FiscalProvider {
  readonly nome = "mock";
  private readonly atrasoMs: number;
  private readonly webhookUrl?: string;
  private readonly webhookSegredo?: string;

  constructor(opcoes: { atrasoMs?: number; webhookUrl?: string; webhookSegredo?: string } = {}) {
    this.atrasoMs = opcoes.atrasoMs ?? Number(process.env.MOCK_FISCAL_ATRASO_MS ?? 1500);
    this.webhookUrl = opcoes.webhookUrl ?? process.env.MOCK_FISCAL_WEBHOOK_URL;
    this.webhookSegredo = opcoes.webhookSegredo ?? process.env.FISCAL_WEBHOOK_SECRET;
  }

  async registrarEmpresa(_e: EmitenteFiscal): Promise<void> {}

  async configurarEmpresa(_cnpj: string, _c: ConfiguracaoEmpresaFiscal): Promise<void> {}

  async enviarCertificado(cnpj: string, arquivo: Uint8Array, senha: string): Promise<InfoCertificado> {
    if (arquivo.byteLength < 100) throw new Error("Arquivo de certificado inválido.");
    if (!senha) throw new Error("Informe a senha do certificado.");
    const validade = new Date();
    validade.setFullYear(validade.getFullYear() + 1);
    return {
      titular: `CERTIFICADO SIMULADO:${cnpj}`,
      serial: `MOCK${arquivo.byteLength}`,
      validade: validade.toISOString(),
      emissor: "AC SIMULADA",
    };
  }

  async consultarMunicipio(codigoIbge: string): Promise<MetadadosMunicipio> {
    // Porto Alegre (4314902) e a maioria dos municípios já aderiu ao padrão nacional
    return { codigo_ibge: codigoIbge, provedor: "Nacional", nacional: true, ambientes: ["homologacao", "producao"] };
  }

  async emitir(p: PedidoEmissao): Promise<RespostaDocumento> {
    // Nunca simular autorização com valor fiscal
    if (p.ambiente === "producao") {
      throw new ErroFiscal("O emissor simulado (FISCAL_PROVIDER=mock) não emite em produção. Configure a API fiscal ou volte a loja para homologação.");
    }
    const erros = validarPedido(p);
    if (erros.length) {
      return this.resposta({ t: p.tipo, ts: Date.now(), n: p.numero, s: p.serie, cnpj: p.emitente.cnpj, uf: p.emitente.endereco.uf, amb: p.ambiente, v: 0, rej: { c: "225", m: erros.join(" ") } }, "erro");
    }
    let rej: EstadoMock["rej"];
    if (p.itens.some((i) => i.descricao.includes("[REJEITAR]"))) rej = { c: "999", m: "Rejeicao: Erro nao catalogado (simulacao)" };
    else if (p.itens.some((i) => i.ncm === "00000000")) rej = { c: "778", m: "Rejeicao: Informado NCM inexistente" };
    else if (p.destinatario?.cpf_cnpj && !validarCpfCnpj(p.destinatario.cpf_cnpj)) {
      rej = { c: p.destinatario.cpf_cnpj.length === 11 ? "237" : "208", m: "Rejeicao: CPF/CNPJ do destinatario invalido" };
    }
    const estado: EstadoMock = {
      t: p.tipo,
      ts: Date.now(),
      n: p.numero,
      s: p.serie,
      cnpj: p.emitente.cnpj,
      uf: p.emitente.endereco.uf,
      amb: p.ambiente,
      v: p.itens.reduce((s, i) => s + i.valor_bruto_centavos - i.desconto_centavos, 0),
      rej,
    };
    const id = codificar(estado);
    this.agendarWebhook(p.tipo, id);
    return this.resposta(estado, "processando");
  }

  private resposta(e: EstadoMock, forcar?: "processando" | "erro"): RespostaDocumento {
    const id = codificar(e);
    const pronto = Date.now() - e.ts >= this.atrasoMs;
    const status = forcar ?? (!pronto ? "processando" : e.rej ? "rejeitada" : "autorizada");
    const mensagens: MensagemFiscal[] = e.rej && status !== "processando" ? [{ codigo: e.rej.c, descricao: e.rej.m }] : [];
    const autorizada = status === "autorizada";
    return {
      provedor_id: id,
      status,
      numero: autorizada ? String(e.n) : null,
      serie: e.s,
      chave: autorizada && e.t !== "nfse" ? chaveAcesso(e) : null,
      protocolo: autorizada ? `1${String(CODIGO_UF[e.uf] ?? 43)}${String(e.ts).slice(-11)}` : null,
      codigo_verificacao: autorizada && e.t === "nfse" ? id.slice(-8).toUpperCase() : null,
      link_url: null,
      data_emissao: new Date(e.ts).toISOString(),
      codigo_status: autorizada ? "100" : (e.rej?.c ?? null),
      motivo_status: autorizada ? "Autorizado o uso (simulação)" : (e.rej?.m ?? null),
      mensagens,
      bruto: { simulado: true, ...e },
    };
  }

  async consultar(_tipo: TipoDocumento, provedorId: string): Promise<RespostaDocumento> {
    const e = decodificar(provedorId);
    return this.resposta(e);
  }

  async baixarXml(tipo: TipoDocumento, provedorId: string): Promise<Uint8Array> {
    const e = decodificar(provedorId);
    const r = this.resposta(e);
    const xml =
      tipo === "nfse"
        ? `<?xml version="1.0" encoding="UTF-8"?><NFSe simulada="true"><infNFSe><nNFSe>${e.n}</nNFSe><cVerif>${r.codigo_verificacao}</cVerif><vLiq>${(e.v / 100).toFixed(2)}</vLiq><emit><CNPJ>${e.cnpj}</CNPJ></emit></infNFSe></NFSe>`
        : `<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00" simulada="true"><NFe><infNFe Id="NFe${r.chave}"><ide><mod>${tipo === "nfce" ? 65 : 55}</mod><serie>${e.s}</serie><nNF>${e.n}</nNF><tpAmb>${e.amb === "producao" ? 1 : 2}</tpAmb></ide><emit><CNPJ>${e.cnpj}</CNPJ></emit><total><ICMSTot><vNF>${(e.v / 100).toFixed(2)}</vNF></ICMSTot></total></infNFe></NFe><protNFe><infProt><chNFe>${r.chave}</chNFe><nProt>${r.protocolo}</nProt><cStat>100</cStat></infProt></protNFe></nfeProc>`;
    return new Uint8Array(Buffer.from(xml, "utf8"));
  }

  async baixarPdf(tipo: TipoDocumento, provedorId: string): Promise<Uint8Array> {
    const e = decodificar(provedorId);
    const r = this.resposta(e);
    const nome = tipo === "nfse" ? "DANFSE" : tipo === "nfce" ? "DANFE NFC-e" : "DANFE";
    return pdfSimples([
      `${nome} - DOCUMENTO SIMULADO - SEM VALOR FISCAL`,
      `Emitente CNPJ: ${e.cnpj}`,
      `Numero: ${e.n}   Serie: ${e.s}`,
      `Valor: R$ ${(e.v / 100).toFixed(2).replace(".", ",")}`,
      r.chave ? `Chave: ${r.chave}` : `Codigo de verificacao: ${r.codigo_verificacao ?? "-"}`,
      `Protocolo: ${r.protocolo ?? "-"}`,
      `Emitido em: ${new Date(e.ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
      "Gerado pelo emissor simulado (FISCAL_PROVIDER=mock).",
    ]);
  }

  async cancelar(_tipo: TipoDocumento, provedorId: string, justificativa: string): Promise<RespostaEvento> {
    const e = decodificar(provedorId);
    if (justificativa.trim().length < 15) {
      return { status: "rejeitado", mensagem: "A justificativa deve ter pelo menos 15 caracteres." };
    }
    return { provedor_id: `mock_evt_canc_${e.n}_${Date.now()}`, status: "registrado", protocolo: `9${Date.now()}`, mensagem: "Evento registrado (simulação)" };
  }

  async cartaCorrecao(provedorId: string, correcao: string): Promise<RespostaEvento> {
    const e = decodificar(provedorId);
    if (e.t !== "nfe") return { status: "rejeitado", mensagem: "Carta de correção só existe para NF-e." };
    if (correcao.trim().length < 15) return { status: "rejeitado", mensagem: "A correção deve ter pelo menos 15 caracteres." };
    return { provedor_id: `mock_evt_cce_${e.n}_${Date.now()}`, status: "registrado", protocolo: `8${Date.now()}`, mensagem: "Carta de correção registrada (simulação)" };
  }

  async baixarPdfCartaCorrecao(provedorId: string): Promise<Uint8Array> {
    const e = decodificar(provedorId);
    return pdfSimples(["CARTA DE CORRECAO - SIMULADA", `NF-e numero ${e.n} serie ${e.s}`, "Sem valor fiscal."]);
  }

  interpretarWebhook(corpo: unknown): EventoWebhook | null {
    const c = corpo as { tipo?: string; id?: string };
    if (!c?.id || !["nfse", "nfce", "nfe"].includes(c.tipo ?? "")) return null;
    return { tipo: c.tipo as TipoDocumento, provedor_id: c.id };
  }

  private agendarWebhook(tipo: TipoDocumento, id: string) {
    if (!this.webhookUrl || !this.webhookSegredo) return;
    const url = this.webhookUrl;
    const segredo = this.webhookSegredo;
    setTimeout(() => {
      const corpo = JSON.stringify({ tipo, id, evento: "documento.atualizado" });
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", [CABECALHO_ASSINATURA]: assinarWebhook(segredo, corpo) },
        body: corpo,
      }).catch(() => undefined);
    }, this.atrasoMs + 200).unref?.();
  }
}
