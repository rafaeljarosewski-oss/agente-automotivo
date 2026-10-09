/**
 * Provedor real: ACBr API (sucessora da Nuvem Fiscal) e Nuvem Fiscal (legado).
 * As duas APIs têm o mesmo OpenAPI; mudam apenas as URLs de token e de API (ver docs/DECISOES.md, D01).
 */
import { montarDps, montarNfe } from "./mapeamento";
import {
  ErroFiscal,
  type ConfiguracaoEmpresaFiscal,
  type EmitenteFiscal,
  type EventoWebhook,
  type FiscalProvider,
  type InfoCertificado,
  type MensagemFiscal,
  type MetadadosMunicipio,
  type PedidoEmissao,
  type RespostaDocumento,
  type RespostaEvento,
  type TipoDocumento,
} from "./tipos";

export type VarianteApi = "acbr" | "nuvemfiscal";

export interface ConfigApiFiscal {
  variante: VarianteApi;
  clientId: string;
  clientSecret: string;
  escopos: string;
  /** "sandbox" (credencial de homologação) ou "producao" */
  credencial: "sandbox" | "producao";
  urlApi?: string;
  urlToken?: string;
  fetch?: typeof fetch;
}

export const URLS: Record<VarianteApi, { token: string; producao: string; sandbox: string }> = {
  acbr: {
    token: "https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token",
    producao: "https://prod.acbr.api.br",
    sandbox: "https://hom.acbr.api.br",
  },
  nuvemfiscal: {
    token: "https://auth.nuvemfiscal.com.br/oauth/token",
    producao: "https://api.nuvemfiscal.com.br",
    sandbox: "https://api.sandbox.nuvemfiscal.com.br",
  },
};

interface Token {
  valor: string;
  expiraEm: number;
}

const cacheTokens = new Map<string, Token>();

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

function opSimpNac(regime: ConfiguracaoEmpresaFiscal["regime"]): number {
  if (regime === "mei") return 2;
  if (regime === "simples_nacional" || regime === "simples_excesso") return 3;
  return 1;
}

function crtDe(regime: ConfiguracaoEmpresaFiscal["regime"]): number {
  return regime === "simples_nacional" ? 1 : regime === "simples_excesso" ? 2 : regime === "mei" ? 4 : 3;
}

export function mapearNfse(r: Json): RespostaDocumento {
  const status: Record<string, RespostaDocumento["status"]> = {
    processando: "processando",
    autorizada: "autorizada",
    negada: "rejeitada",
    cancelada: "cancelada",
    substituida: "cancelada",
    erro: "erro",
  };
  const mensagens: MensagemFiscal[] = (r?.mensagens ?? []).map((m: Json) => ({
    codigo: m.codigo ?? null,
    descricao: m.descricao ?? "",
    correcao: m.correcao ?? null,
  }));
  return {
    provedor_id: r.id,
    status: status[r.status] ?? "processando",
    numero: r.numero ?? null,
    serie: r.DPS?.serie ?? null,
    codigo_verificacao: r.codigo_verificacao ?? null,
    link_url: r.link_url ?? null,
    data_emissao: r.data_emissao ?? null,
    chave: r.chave_acesso ?? r.chave ?? null,
    mensagens,
    motivo_status: mensagens[0]?.descricao ?? null,
    codigo_status: mensagens[0]?.codigo ?? null,
    bruto: r,
  };
}

export function mapearDfe(r: Json): RespostaDocumento {
  const status: Record<string, RespostaDocumento["status"]> = {
    pendente: "processando",
    autorizado: "autorizada",
    rejeitado: "rejeitada",
    denegado: "rejeitada",
    cancelado: "cancelada",
    encerrado: "autorizada",
    erro: "erro",
  };
  const aut = r?.autorizacao ?? {};
  const mensagens: MensagemFiscal[] = [];
  if (aut.motivo_status && r.status !== "autorizado") {
    mensagens.push({ codigo: aut.codigo_status != null ? String(aut.codigo_status) : null, descricao: aut.motivo_status });
  }
  if (aut.mensagem) mensagens.push({ codigo: aut.codigo_mensagem != null ? String(aut.codigo_mensagem) : null, descricao: aut.mensagem });
  return {
    provedor_id: r.id,
    status: status[r.status] ?? "processando",
    numero: r.numero != null ? String(r.numero) : null,
    serie: r.serie != null ? String(r.serie) : null,
    chave: r.chave ?? aut.chave_acesso ?? null,
    protocolo: aut.numero_protocolo ?? null,
    data_emissao: r.data_emissao ?? null,
    codigo_status: aut.codigo_status != null ? String(aut.codigo_status) : null,
    motivo_status: aut.motivo_status ?? null,
    mensagens,
    bruto: r,
  };
}

function mapearEvento(r: Json): RespostaEvento {
  const status = (r?.status ?? "pendente") as RespostaEvento["status"];
  return {
    provedor_id: r?.id ?? null,
    status: ["pendente", "registrado", "rejeitado", "erro"].includes(status) ? status : "pendente",
    protocolo: r?.numero_protocolo ?? null,
    mensagem: r?.motivo_status ?? r?.mensagem ?? null,
    bruto: r,
  };
}

export class ProvedorApiFiscal implements FiscalProvider {
  readonly nome: string;
  private readonly urlApi: string;
  private readonly urlToken: string;
  private readonly fetcher: typeof fetch;

  constructor(private readonly config: ConfigApiFiscal) {
    this.nome = config.variante;
    const urls = URLS[config.variante];
    this.urlApi = (config.urlApi ?? (config.credencial === "producao" ? urls.producao : urls.sandbox)).replace(/\/$/, "");
    this.urlToken = config.urlToken ?? urls.token;
    this.fetcher = config.fetch ?? fetch;
  }

  private async token(): Promise<string> {
    const chave = `${this.urlToken}|${this.config.clientId}`;
    const atual = cacheTokens.get(chave);
    if (atual && atual.expiraEm > Date.now() + 60_000) return atual.valor;
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new ErroFiscal("Credenciais da API fiscal não configuradas (FISCAL_CLIENT_ID / FISCAL_CLIENT_SECRET).");
    }
    const corpo = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: this.config.escopos,
    });
    const resp = await this.fetcher(this.urlToken, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: corpo,
    });
    if (!resp.ok) {
      throw new ErroFiscal(`Não foi possível autenticar na API fiscal (HTTP ${resp.status}). Confira as credenciais.`, [], resp.status);
    }
    const json = (await resp.json()) as { access_token: string; expires_in?: number };
    cacheTokens.set(chave, { valor: json.access_token, expiraEm: Date.now() + (json.expires_in ?? 3600) * 1000 });
    return json.access_token;
  }

  private async requisicao(metodo: string, caminho: string, corpo?: unknown, binario = false): Promise<Json> {
    const token = await this.token();
    const resp = await this.fetcher(`${this.urlApi}${caminho}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: binario ? "*/*" : "application/json",
        ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
    if (!resp.ok) {
      let detalhe: Json = null;
      try {
        detalhe = await resp.json();
      } catch {
        /* resposta sem JSON */
      }
      const erro = detalhe?.error ?? detalhe;
      const mensagens: MensagemFiscal[] = [
        ...(erro?.errors ?? []).map((x: Json) => ({ codigo: x.code ?? null, descricao: x.message ?? String(x) })),
      ];
      const mensagem = erro?.message ?? `Erro ${resp.status} na API fiscal.`;
      throw new ErroFiscal(mensagem, mensagens.length ? mensagens : [{ codigo: erro?.code ?? null, descricao: mensagem }], resp.status);
    }
    if (binario) return new Uint8Array(await resp.arrayBuffer());
    if (resp.status === 204) return null;
    const texto = await resp.text();
    return texto ? JSON.parse(texto) : null;
  }

  async registrarEmpresa(e: EmitenteFiscal): Promise<void> {
    const corpo = {
      cpf_cnpj: e.cnpj,
      nome_razao_social: e.razao_social,
      nome_fantasia: e.nome_fantasia ?? undefined,
      inscricao_estadual: e.inscricao_estadual ?? undefined,
      inscricao_municipal: e.inscricao_municipal ?? undefined,
      fone: e.telefone ?? undefined,
      email: e.email ?? "contato@exemplo.com.br",
      endereco: {
        logradouro: e.endereco.logradouro,
        numero: e.endereco.numero || "S/N",
        complemento: e.endereco.complemento ?? undefined,
        bairro: e.endereco.bairro,
        codigo_municipio: e.endereco.codigo_municipio,
        cidade: e.endereco.cidade,
        uf: e.endereco.uf,
        cep: e.endereco.cep,
      },
    };
    try {
      await this.requisicao("GET", `/empresas/${e.cnpj}`);
      await this.requisicao("PUT", `/empresas/${e.cnpj}`, corpo);
    } catch (erro) {
      if (erro instanceof ErroFiscal && erro.status === 404) {
        await this.requisicao("POST", "/empresas", corpo);
        return;
      }
      throw erro;
    }
  }

  async configurarEmpresa(cnpj: string, c: ConfiguracaoEmpresaFiscal): Promise<void> {
    if (c.nfse) {
      await this.requisicao("PUT", `/empresas/${cnpj}/nfse`, {
        ambiente: c.ambiente,
        rps: { lote: 1, serie: c.nfse.serie, numero: c.nfse.proximo_numero },
        regTrib: {
          opSimpNac: opSimpNac(c.regime),
          ...(opSimpNac(c.regime) === 3 ? { regApTribSN: 1 } : {}),
          ...(c.nfse.regime_especial ? { regEspTrib: c.nfse.regime_especial } : {}),
        },
        incentivo_fiscal: c.nfse.incentivo_fiscal ?? false,
      });
    }
    if (c.nfce) {
      await this.requisicao("PUT", `/empresas/${cnpj}/nfce`, {
        CRT: crtDe(c.regime),
        ambiente: c.ambiente,
        sefaz: { id_csc: c.nfce.csc_id, csc: c.nfce.csc },
      });
    }
    if (c.nfe) {
      await this.requisicao("PUT", `/empresas/${cnpj}/nfe`, { CRT: crtDe(c.regime), ambiente: c.ambiente });
    }
  }

  async enviarCertificado(cnpj: string, arquivo: Uint8Array, senha: string): Promise<InfoCertificado> {
    const r = await this.requisicao("PUT", `/empresas/${cnpj}/certificado`, {
      certificado: Buffer.from(arquivo).toString("base64"),
      password: senha,
    });
    return {
      titular: r?.subject_name ?? r?.nome_razao_social ?? null,
      serial: r?.serial_number ?? null,
      validade: r?.not_valid_after ?? null,
      emissor: r?.issuer_name ?? null,
    };
  }

  async consultarMunicipio(codigoIbge: string): Promise<MetadadosMunicipio | null> {
    try {
      const r = await this.requisicao("GET", `/nfse/cidades/${codigoIbge}`);
      const provedor: string | null = r?.provedor ?? null;
      return {
        codigo_ibge: codigoIbge,
        municipio: r?.municipio ?? null,
        uf: r?.uf ?? null,
        provedor,
        nacional: Boolean(provedor && /nacional|padr[aã]o nacional|sefin|adn/i.test(provedor)),
        ambientes: r?.ambientes ?? [],
      };
    } catch (e) {
      if (e instanceof ErroFiscal && e.status === 404) return null;
      throw e;
    }
  }

  async emitir(p: PedidoEmissao): Promise<RespostaDocumento> {
    if (p.tipo === "nfse") return mapearNfse(await this.requisicao("POST", "/nfse/dps", montarDps(p)));
    return mapearDfe(await this.requisicao("POST", `/${p.tipo}`, montarNfe(p)));
  }

  async consultar(tipo: TipoDocumento, id: string): Promise<RespostaDocumento> {
    const r = await this.requisicao("GET", `/${tipo}/${id}`);
    return tipo === "nfse" ? mapearNfse(r) : mapearDfe(r);
  }

  baixarXml(tipo: TipoDocumento, id: string): Promise<Uint8Array> {
    return this.requisicao("GET", `/${tipo}/${id}/xml`, undefined, true);
  }

  baixarPdf(tipo: TipoDocumento, id: string): Promise<Uint8Array> {
    return this.requisicao("GET", `/${tipo}/${id}/pdf`, undefined, true);
  }

  async cancelar(tipo: TipoDocumento, id: string, justificativa: string): Promise<RespostaEvento> {
    if (tipo === "nfse") {
      const r = await this.requisicao("POST", `/nfse/${id}/cancelamento`, { codigo: "1", motivo: justificativa });
      const status = r?.status === "concluido" ? "registrado" : r?.status === "rejeitado" ? "rejeitado" : r?.status === "erro" ? "erro" : "pendente";
      return { provedor_id: r?.id ?? null, status, mensagem: r?.mensagens?.[0]?.descricao ?? r?.motivo ?? null, bruto: r };
    }
    return mapearEvento(await this.requisicao("POST", `/${tipo}/${id}/cancelamento`, { justificativa }));
  }

  async cartaCorrecao(id: string, correcao: string): Promise<RespostaEvento> {
    return mapearEvento(await this.requisicao("POST", `/nfe/${id}/carta-correcao`, { correcao }));
  }

  baixarPdfCartaCorrecao(id: string): Promise<Uint8Array> {
    return this.requisicao("GET", `/nfe/${id}/carta-correcao/pdf`, undefined, true);
  }

  interpretarWebhook(corpo: unknown): EventoWebhook | null {
    const c = corpo as Json;
    const tipo = c?.tipo ?? c?.type ?? c?.data?.tipo;
    const id = c?.id ?? c?.data?.id;
    if (!["nfse", "nfce", "nfe"].includes(tipo) || typeof id !== "string") return null;
    return { tipo, provedor_id: id };
  }
}
