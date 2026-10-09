import { describe, expect, it, vi } from "vitest";

import { mapearDfe, mapearNfse, ProvedorApiFiscal } from "./api";
import { codigoTributacaoNacional, montarDps, montarNfe, TEXTO_HOMOLOGACAO_NFE, TEXTO_HOMOLOGACAO_NFCE_ITEM, validarPedido } from "./mapeamento";
import { dvChave, MockFiscalProvider } from "./mock";
import type { PedidoEmissao } from "./tipos";

const emitente: PedidoEmissao["emitente"] = {
  cnpj: "11222333000181",
  razao_social: "Prime Películas LTDA",
  nome_fantasia: "Prime Películas",
  inscricao_estadual: "0961234567",
  inscricao_municipal: "1234567",
  regime: "simples_nacional",
  cnae: "4530-7/05",
  endereco: { logradouro: "Av. Assis Brasil", numero: "3500", bairro: "Jardim Lindóia", cidade: "Porto Alegre", uf: "RS", cep: "91010003", codigo_municipio: "4314902" },
};

function pedido(tipo: PedidoEmissao["tipo"], extra: Partial<PedidoEmissao> = {}): PedidoEmissao {
  return {
    tipo,
    ambiente: "homologacao",
    referencia: `teste-${tipo}`,
    serie: "1",
    numero: 15,
    data_emissao: "2026-10-09T10:00:00-03:00",
    emitente,
    destinatario: { tipo_pessoa: "PF", cpf_cnpj: "52998224725", nome: "Maria da Silva" },
    itens:
      tipo === "nfse"
        ? [
            { numero: 1, codigo: "S1", descricao: "Aplicação de película G20", quantidade: 1, unidade: "UN", valor_unitario_centavos: 120000, valor_bruto_centavos: 120000, desconto_centavos: 10000, codigo_servico: "14.01", aliquota_iss: 4 },
          ]
        : [
            { numero: 1, codigo: "P1", descricao: "Lâmpada LED H7", quantidade: 2, unidade: "UN", valor_unitario_centavos: 4500, valor_bruto_centavos: 9000, desconto_centavos: 500, ncm: "85395200", cfop: "5102", csosn: "102", origem: 0 },
            { numero: 2, codigo: "P2", descricao: "Alarme", quantidade: 1, unidade: "UN", valor_unitario_centavos: 39000, valor_bruto_centavos: 39000, desconto_centavos: 0, ncm: "85311090", cfop: "5405", csosn: "500", origem: 0 },
          ],
    pagamentos: [{ forma: "pix", valor_centavos: tipo === "nfse" ? 110000 : 47500 }],
    natureza_operacao: "Venda de mercadoria",
    nfse_provedor: "nacional",
    ibscbs: { informar: true, aliquota_ibs_uf: 0.1, aliquota_ibs_mun: 0, aliquota_cbs: 0.9 },
    informacoes_adicionais: "OS nº 10",
    ...extra,
  };
}

describe("mapeamento DPS (NFS-e)", () => {
  it("monta prestador, tomador, serviço, desconto e IBS/CBS", () => {
    const dps = montarDps(pedido("nfse"));
    expect(dps.provedor).toBe("nacional");
    expect(dps.infDPS.tpAmb).toBe(2);
    expect(dps.infDPS.prest.CNPJ).toBe("11222333000181");
    expect(dps.infDPS.toma).toMatchObject({ CPF: "52998224725", xNome: "Maria da Silva" });
    expect(dps.infDPS.serv.cServ.cTribNac).toBe("140101");
    expect(dps.infDPS.valores.vServPrest.vServ).toBe(1200);
    expect(dps.infDPS.valores.vDescCondIncond?.vDescIncond).toBe(100);
    expect(dps.infDPS.valores.trib.tribMun).toMatchObject({ tribISSQN: 1, pAliq: 4, tpRetISSQN: 1 });
    expect(dps.infDPS.IBSCBS?.valores.trib.gIBSCBS).toEqual({ CST: "000", cClassTrib: "000001" });
  });

  it("normaliza o código de tributação nacional", () => {
    expect(codigoTributacaoNacional("14.01.01")).toBe("140101");
    expect(codigoTributacaoNacional("14.06")).toBe("140601");
    expect(codigoTributacaoNacional("140601")).toBe("140601");
  });
});

describe("mapeamento NF-e / NFC-e", () => {
  it("NFC-e em homologação usa o texto padrão no 1º item e CSOSN por produto", () => {
    const nfce = montarNfe(pedido("nfce"));
    expect(nfce.infNFe.ide).toMatchObject({ mod: 65, cUF: 43, tpImp: 4, nNF: 15, serie: 1, indFinal: 1, tpAmb: 2 });
    expect(nfce.infNFe.det[0]!.prod.xProd).toBe(TEXTO_HOMOLOGACAO_NFCE_ITEM);
    expect(nfce.infNFe.det[1]!.prod.xProd).toBe("Alarme");
    expect(nfce.infNFe.det[0]!.imposto.ICMS).toEqual({ ICMSSN102: { orig: 0, CSOSN: "102" } });
    expect(nfce.infNFe.det[1]!.imposto.ICMS).toEqual({ ICMSSN500: { orig: 0, CSOSN: "500" } });
    expect(nfce.infNFe.total.ICMSTot).toMatchObject({ vProd: 480, vDesc: 5, vNF: 475 });
    expect(nfce.infNFe.pag.detPag[0]).toMatchObject({ tPag: "17", vPag: 475 });
    expect(nfce.infNFe.total.IBSCBSTot?.gCBS.vCBS).toBe(4.28); // 0,9% de 85,00 (0,77) + 390,00 (3,51)
  });

  it("NF-e em homologação troca o nome do destinatário", () => {
    const dest = { tipo_pessoa: "PJ" as const, cpf_cnpj: "11222333000181", nome: "Transportes Sul", endereco: emitente.endereco };
    const nfe = montarNfe(pedido("nfe", { destinatario: dest }));
    expect(nfe.infNFe.ide.mod).toBe(55);
    expect(nfe.infNFe.dest).toMatchObject({ CNPJ: "11222333000181", xNome: TEXTO_HOMOLOGACAO_NFE, indIEDest: 9 });
    const prod = montarNfe(pedido("nfe", { destinatario: dest, ambiente: "producao" }));
    expect(prod.infNFe.dest?.xNome).toBe("Transportes Sul");
  });

  it("valida dados obrigatórios antes de enviar", () => {
    const p = pedido("nfe", { destinatario: { tipo_pessoa: "PF", nome: "Sem CPF" } });
    p.itens[0]!.ncm = null;
    const erros = validarPedido(p);
    expect(erros.join(" ")).toContain("NCM");
    expect(erros.join(" ")).toContain("CPF/CNPJ");
    expect(validarPedido(pedido("nfse", { emitente: { ...emitente, inscricao_municipal: null } })).join()).toContain("inscrição municipal");
  });
});

describe("FiscalProviderMock", () => {
  it("processa e depois autoriza", async () => {
    const mock = new MockFiscalProvider({ atrasoMs: 30 });
    const r = await mock.emitir(pedido("nfce"));
    expect(r.status).toBe("processando");
    await new Promise((ok) => setTimeout(ok, 40));
    const c = await mock.consultar("nfce", r.provedor_id);
    expect(c.status).toBe("autorizada");
    expect(c.chave).toHaveLength(44);
    expect(Number(c.chave!.at(-1))).toBe(dvChave(c.chave!.slice(0, 43)));
    const pdf = await mock.baixarPdf("nfce", r.provedor_id);
    expect(Buffer.from(pdf).subarray(0, 5).toString()).toBe("%PDF-");
    const xml = Buffer.from(await mock.baixarXml("nfce", r.provedor_id)).toString();
    expect(xml).toContain(c.chave!);
  });

  it("recusa emitir em produção (nunca simula nota com valor fiscal)", async () => {
    const mock = new MockFiscalProvider({ atrasoMs: 0 });
    await expect(mock.emitir(pedido("nfce", { ambiente: "producao" }))).rejects.toThrow(/não emite em produção/);
  });

  it("simula rejeição por NCM inexistente e por marcação [REJEITAR]", async () => {
    const mock = new MockFiscalProvider({ atrasoMs: 0 });
    const p = pedido("nfce");
    p.itens[0]!.ncm = "00000000";
    const r = await mock.consultar("nfce", (await mock.emitir(p)).provedor_id);
    expect(r.status).toBe("rejeitada");
    expect(r.mensagens[0]).toMatchObject({ codigo: "778" });

    const s = pedido("nfse");
    s.itens[0]!.descricao = "Serviço [REJEITAR]";
    const r2 = await mock.consultar("nfse", (await mock.emitir(s)).provedor_id);
    expect(r2.status).toBe("rejeitada");
  });

  it("retorna erro quando faltam dados obrigatórios", async () => {
    const mock = new MockFiscalProvider({ atrasoMs: 0 });
    const r = await mock.emitir(pedido("nfse", { emitente: { ...emitente, inscricao_municipal: null } }));
    expect(r.status).toBe("erro");
  });

  it("cancela e registra carta de correção", async () => {
    const mock = new MockFiscalProvider({ atrasoMs: 0 });
    const r = await mock.emitir(pedido("nfe", { destinatario: { tipo_pessoa: "PF", cpf_cnpj: "52998224725", nome: "Maria", endereco: emitente.endereco } }));
    expect((await mock.cancelar("nfe", r.provedor_id, "curta")).status).toBe("rejeitado");
    expect((await mock.cancelar("nfe", r.provedor_id, "Cliente desistiu da compra")).status).toBe("registrado");
    expect((await mock.cartaCorrecao(r.provedor_id, "Corrige o endereço do destinatário")).status).toBe("registrado");
  });
});

describe("provedor HTTP (ACBr / Nuvem Fiscal)", () => {
  it("autentica com client_credentials, envia a DPS e interpreta a resposta", async () => {
    const chamadas: { url: string; init?: RequestInit }[] = [];
    const fetchFalso = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      chamadas.push({ url: String(url), init });
      if (String(url).includes("/token")) return Response.json({ access_token: "tok", expires_in: 3600 });
      return Response.json({ id: "nfs_123", status: "processando", DPS: { serie: "1", nDPS: "15" } });
    });
    const api = new ProvedorApiFiscal({
      variante: "acbr",
      clientId: "id",
      clientSecret: "segredo",
      escopos: "nfse",
      credencial: "sandbox",
      fetch: fetchFalso as unknown as typeof fetch,
    });
    const r = await api.emitir(pedido("nfse"));
    expect(r).toMatchObject({ provedor_id: "nfs_123", status: "processando" });
    expect(chamadas[0]!.url).toBe("https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token");
    expect(String(chamadas[0]!.init!.body)).toContain("grant_type=client_credentials");
    expect(chamadas[1]!.url).toBe("https://hom.acbr.api.br/nfse/dps");
    expect((chamadas[1]!.init!.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("converte erros da API em ErroFiscal com mensagens", async () => {
    const api = new ProvedorApiFiscal({
      variante: "nuvemfiscal",
      clientId: "id2",
      clientSecret: "s",
      escopos: "nfe",
      credencial: "producao",
      fetch: (async (url: string) =>
        String(url).includes("/token")
          ? Response.json({ access_token: "t" })
          : Response.json({ error: { code: "ValidationFailed", message: "Dados inválidos", errors: [{ code: "NCM", message: "NCM inválido" }] } }, { status: 400 })) as unknown as typeof fetch,
    });
    await expect(api.emitir(pedido("nfe"))).rejects.toMatchObject({ name: "ErroFiscal", status: 400, mensagens: [{ codigo: "NCM", descricao: "NCM inválido" }] });
  });

  it("mapeia status das respostas", () => {
    expect(mapearNfse({ id: "1", status: "negada", mensagens: [{ codigo: "E1", descricao: "x" }] }).status).toBe("rejeitada");
    expect(mapearDfe({ id: "2", status: "autorizado", chave: "c", autorizacao: { numero_protocolo: "p", codigo_status: 100 } })).toMatchObject({ status: "autorizada", protocolo: "p", chave: "c" });
    expect(mapearDfe({ id: "3", status: "rejeitado", autorizacao: { codigo_status: 778, motivo_status: "NCM inexistente" } }).mensagens[0]).toEqual({ codigo: "778", descricao: "NCM inexistente" });
  });
});
