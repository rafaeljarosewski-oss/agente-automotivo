/**
 * Converte o pedido de emissão (formato interno) nos layouts da API fiscal:
 *  - NFS-e: DPS (Declaração de Prestação de Serviço) — POST /nfse/dps
 *  - NF-e / NFC-e: layout 4.00 da SEFAZ em JSON — POST /nfe e POST /nfce
 * Os campos seguem o OpenAPI da ACBr API (idêntico ao da Nuvem Fiscal).
 */
import { calcularIbsCbs } from "@/lib/dominio/calculos";
import { somenteDigitos } from "@/lib/dominio/documentos";
import type { FormaPagamentoFiscal, ItemFiscal, PedidoEmissao } from "./tipos";

export const TEXTO_HOMOLOGACAO_NFE = "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
export const TEXTO_HOMOLOGACAO_NFCE_ITEM = "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
const VERSAO_APLICATIVO = "OrionOficina 1.0";

/** Código IBGE das UFs (cUF) */
export const CODIGO_UF: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27,
  SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53,
};

/** Centavos → reais com 2 casas (número) */
export function reais(centavos: number): number {
  return Math.round(centavos) / 100;
}

/** Código de Regime Tributário da NF-e */
export function crt(regime: PedidoEmissao["emitente"]["regime"]): number {
  switch (regime) {
    case "simples_nacional":
      return 1;
    case "simples_excesso":
      return 2;
    case "mei":
      return 4;
    default:
      return 3;
  }
}

/** Formas de pagamento da NF-e (tPag) */
export function tPag(forma: FormaPagamentoFiscal): string {
  switch (forma) {
    case "dinheiro":
      return "01";
    case "credito_vista":
    case "credito_parcelado":
      return "03";
    case "debito":
      return "04";
    case "boleto":
      return "15";
    case "pix":
      return "17";
    default:
      return "99";
  }
}

/** "14.01.01" / "14.01" / "140101" → código de tributação nacional de 6 dígitos */
export function codigoTributacaoNacional(codigo: string | null | undefined): string {
  const d = somenteDigitos(codigo);
  if (d.length === 4) return `${d}01`;
  return d.padEnd(6, "0").slice(0, 6);
}

function documento(cpfCnpj: string | null | undefined): { CPF?: string; CNPJ?: string } {
  const doc = (cpfCnpj ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (doc.length === 11) return { CPF: doc };
  if (doc.length === 14) return { CNPJ: doc };
  return {};
}

function liquido(item: ItemFiscal): number {
  return item.valor_bruto_centavos - item.desconto_centavos;
}

// ---------------------------------------------------------------------------
// Validação prévia (evita rejeições óbvias antes de chamar a API)
// ---------------------------------------------------------------------------

export function validarPedido(p: PedidoEmissao): string[] {
  const erros: string[] = [];
  const e = p.emitente;
  if (!e.endereco.codigo_municipio || e.endereco.codigo_municipio.length !== 7) {
    erros.push("Informe o código IBGE do município da oficina (Configurações › Empresa).");
  }
  if (p.itens.length === 0) erros.push("A nota não tem itens.");
  if (p.tipo === "nfse") {
    if (!e.inscricao_municipal) erros.push("Informe a inscrição municipal da oficina para emitir NFS-e.");
    for (const i of p.itens) {
      if (!i.codigo_servico) erros.push(`O serviço "${i.descricao}" está sem código de serviço (LC 116).`);
    }
  } else {
    if (!e.inscricao_estadual) erros.push("Informe a inscrição estadual da oficina para emitir NF-e/NFC-e.");
    for (const i of p.itens) {
      if (!i.ncm || somenteDigitos(i.ncm).length !== 8) erros.push(`O produto "${i.descricao}" está sem NCM válido (8 dígitos).`);
      if (!i.cfop || somenteDigitos(i.cfop).length !== 4) erros.push(`O produto "${i.descricao}" está sem CFOP válido.`);
      if (crt(e.regime) !== 3 && !i.csosn) erros.push(`O produto "${i.descricao}" está sem CSOSN.`);
      if (crt(e.regime) === 3 && !i.cst_icms) erros.push(`O produto "${i.descricao}" está sem CST de ICMS.`);
    }
    if (p.tipo === "nfe") {
      if (!p.destinatario?.cpf_cnpj) erros.push("A NF-e exige CPF/CNPJ do cliente.");
      if (!p.destinatario?.endereco?.codigo_municipio) erros.push("A NF-e exige o endereço completo do cliente (com cidade/CEP).");
    }
  }
  return erros;
}

// ---------------------------------------------------------------------------
// NFS-e (DPS)
// ---------------------------------------------------------------------------

export function montarDps(p: PedidoEmissao) {
  const e = p.emitente;
  const valorServicos = p.itens.reduce((s, i) => s + i.valor_bruto_centavos, 0);
  const descontos = p.itens.reduce((s, i) => s + i.desconto_centavos, 0);
  const principal = p.itens[0]!;
  const descricao = p.itens
    .map((i) => `${i.descricao}${i.quantidade !== 1 ? ` (${String(i.quantidade).replace(".", ",")} ${i.unidade})` : ""}`)
    .join("; ");
  const dest = p.destinatario;

  const toma = dest?.cpf_cnpj
    ? {
        ...documento(dest.cpf_cnpj),
        xNome: dest.nome,
        ...(dest.endereco
          ? {
              end: {
                endNac: { cMun: dest.endereco.codigo_municipio, CEP: dest.endereco.cep },
                xLgr: dest.endereco.logradouro,
                nro: dest.endereco.numero || "S/N",
                ...(dest.endereco.complemento ? { xCpl: dest.endereco.complemento } : {}),
                xBairro: dest.endereco.bairro,
              },
            }
          : {}),
        ...(dest.telefone ? { fone: somenteDigitos(dest.telefone) } : {}),
        ...(dest.email ? { email: dest.email } : {}),
      }
    : undefined;

  const ibscbs = p.ibscbs.informar
    ? {
        finNFSe: 0,
        indFinal: dest?.tipo_pessoa === "PJ" ? 0 : 1,
        cIndOp: "100301", // prestação de serviço no local do estabelecimento — validar com o contador
        indDest: 0,
        valores: {
          trib: {
            gIBSCBS: {
              CST: principal.cst_ibs_cbs ?? "000",
              cClassTrib: principal.cclass_trib ?? "000001",
            },
          },
        },
      }
    : undefined;

  return {
    provedor: p.nfse_provedor ?? "padrao",
    ambiente: p.ambiente,
    referencia: p.referencia,
    infDPS: {
      tpAmb: p.ambiente === "producao" ? 1 : 2,
      dhEmi: p.data_emissao,
      verAplic: VERSAO_APLICATIVO,
      dCompet: p.data_emissao.slice(0, 10),
      prest: {
        CNPJ: e.cnpj,
        ...(p.nfse_regime_especial ? { regTrib: { regEspTrib: p.nfse_regime_especial } } : {}),
      },
      ...(toma ? { toma } : {}),
      serv: {
        locPrest: { cLocPrestacao: e.endereco.codigo_municipio },
        cServ: {
          cTribNac: codigoTributacaoNacional(principal.codigo_servico),
          ...(principal.codigo_tributacao_municipal ? { cTribMun: principal.codigo_tributacao_municipal } : {}),
          ...(e.cnae ? { CNAE: somenteDigitos(e.cnae) } : {}),
          xDescServ: descricao.slice(0, 2000),
          ...(principal.codigo_nbs ? { cNBS: somenteDigitos(principal.codigo_nbs) } : {}),
        },
        ...(p.informacoes_adicionais ? { infoCompl: { xInfComp: p.informacoes_adicionais.slice(0, 2000) } } : {}),
      },
      valores: {
        vServPrest: { vServ: reais(valorServicos) },
        ...(descontos > 0 ? { vDescCondIncond: { vDescIncond: reais(descontos) } } : {}),
        trib: {
          tribMun: {
            tribISSQN: 1,
            ...(principal.aliquota_iss ? { pAliq: Number(principal.aliquota_iss) } : {}),
            tpRetISSQN: 1,
          },
          totTrib: { indTotTrib: 0 },
        },
      },
      ...(ibscbs ? { IBSCBS: ibscbs } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// NF-e (modelo 55) e NFC-e (modelo 65)
// ---------------------------------------------------------------------------

function grupoIcms(item: ItemFiscal, regime: number) {
  const orig = item.origem ?? 0;
  if (regime !== 3) {
    const csosn = item.csosn ?? "102";
    if (csosn === "500") return { ICMSSN500: { orig, CSOSN: "500" } };
    if (csosn === "900") return { ICMSSN900: { orig, CSOSN: "900" } };
    return { ICMSSN102: { orig, CSOSN: csosn } }; // 102, 103, 300, 400
  }
  const cst = item.cst_icms ?? "00";
  if (cst === "60") return { ICMS60: { orig, CST: "60" } };
  if (["40", "41", "50"].includes(cst)) return { ICMS40: { orig, CST: cst } };
  const base = liquido(item);
  const aliquota = Number(item.aliquota_icms ?? 0);
  return {
    ICMS00: { orig, CST: "00", modBC: 3, vBC: reais(base), pICMS: aliquota, vICMS: reais(Math.round((base * aliquota) / 100)) },
  };
}

function valorIcms(item: ItemFiscal, regime: number): number {
  if (regime !== 3 || (item.cst_icms ?? "00") !== "00") return 0;
  return Math.round((liquido(item) * Number(item.aliquota_icms ?? 0)) / 100);
}

export function montarNfe(p: PedidoEmissao) {
  const e = p.emitente;
  const nfce = p.tipo === "nfce";
  const regime = crt(e.regime);
  const homologacao = p.ambiente === "homologacao";
  const dest = p.destinatario;
  const docDest = documento(dest?.cpf_cnpj);
  const interestadual = !nfce && dest?.endereco?.uf && dest.endereco.uf !== e.endereco.uf;

  const det = p.itens.map((item, i) => {
    const ibs = calcularIbsCbs(liquido(item), {
      ibs_uf: p.ibscbs.aliquota_ibs_uf,
      ibs_mun: p.ibscbs.aliquota_ibs_mun,
      cbs: p.ibscbs.aliquota_cbs,
    });
    const gtin = item.codigo_barras && /^\d{8,14}$/.test(item.codigo_barras) ? item.codigo_barras : "SEM GTIN";
    const descricao = nfce && homologacao && i === 0 ? TEXTO_HOMOLOGACAO_NFCE_ITEM : item.descricao;
    return {
      nItem: item.numero,
      prod: {
        cProd: item.codigo,
        cEAN: gtin,
        xProd: descricao.slice(0, 120),
        NCM: somenteDigitos(item.ncm),
        ...(item.cest ? { CEST: somenteDigitos(item.cest) } : {}),
        CFOP: somenteDigitos(item.cfop),
        uCom: item.unidade,
        qCom: item.quantidade,
        vUnCom: reais(item.valor_unitario_centavos),
        vProd: reais(item.valor_bruto_centavos),
        cEANTrib: gtin,
        uTrib: item.unidade,
        qTrib: item.quantidade,
        vUnTrib: reais(item.valor_unitario_centavos),
        ...(item.desconto_centavos > 0 ? { vDesc: reais(item.desconto_centavos) } : {}),
        indTot: 1,
      },
      imposto: {
        ICMS: grupoIcms(item, regime),
        PIS: { PISOutr: { CST: item.cst_pis ?? "99", vBC: 0, pPIS: 0, vPIS: 0 } },
        COFINS: { COFINSOutr: { CST: item.cst_cofins ?? "99", vBC: 0, pCOFINS: 0, vCOFINS: 0 } },
        ...(p.ibscbs.informar
          ? {
              IBSCBS: {
                CST: item.cst_ibs_cbs ?? "000",
                cClassTrib: item.cclass_trib ?? "000001",
                gIBSCBS: {
                  vBC: reais(liquido(item)),
                  gIBSUF: { pIBSUF: p.ibscbs.aliquota_ibs_uf, vIBSUF: reais(ibs.ibs_uf_centavos) },
                  gIBSMun: { pIBSMun: p.ibscbs.aliquota_ibs_mun, vIBSMun: reais(ibs.ibs_mun_centavos) },
                  vIBS: reais(ibs.ibs_centavos),
                  gCBS: { pCBS: p.ibscbs.aliquota_cbs, vCBS: reais(ibs.cbs_centavos) },
                },
              },
            }
          : {}),
      },
      _ibs: ibs,
    };
  });

  const vProd = p.itens.reduce((s, i) => s + i.valor_bruto_centavos, 0);
  const vDesc = p.itens.reduce((s, i) => s + i.desconto_centavos, 0);
  const vNF = vProd - vDesc;
  const vICMS = p.itens.reduce((s, i) => s + valorIcms(i, regime), 0);
  const vBC = regime === 3 ? p.itens.filter((i) => (i.cst_icms ?? "00") === "00").reduce((s, i) => s + liquido(i), 0) : 0;
  const tot = det.reduce(
    (a, d) => ({
      ibsUf: a.ibsUf + d._ibs.ibs_uf_centavos,
      ibsMun: a.ibsMun + d._ibs.ibs_mun_centavos,
      cbs: a.cbs + d._ibs.cbs_centavos,
    }),
    { ibsUf: 0, ibsMun: 0, cbs: 0 },
  );

  const pagamentos = p.pagamentos.length > 0 ? p.pagamentos : [{ forma: "outros" as const, valor_centavos: vNF }];

  return {
    ambiente: p.ambiente,
    referencia: p.referencia,
    infNFe: {
      versao: "4.00",
      ide: {
        cUF: CODIGO_UF[e.endereco.uf] ?? 43,
        natOp: p.natureza_operacao,
        mod: nfce ? 65 : 55,
        serie: Number(p.serie),
        nNF: p.numero,
        dhEmi: p.data_emissao,
        tpNF: 1,
        idDest: interestadual ? 2 : 1,
        cMunFG: e.endereco.codigo_municipio,
        tpImp: nfce ? 4 : 1,
        tpEmis: 1,
        tpAmb: p.ambiente === "producao" ? 1 : 2,
        finNFe: 1,
        indFinal: nfce || !dest?.inscricao_estadual ? 1 : 0,
        indPres: 1,
        procEmi: 0,
        verProc: VERSAO_APLICATIVO,
      },
      emit: {
        CNPJ: e.cnpj,
        xNome: e.razao_social,
        ...(e.nome_fantasia ? { xFant: e.nome_fantasia } : {}),
        enderEmit: {
          xLgr: e.endereco.logradouro,
          nro: e.endereco.numero || "S/N",
          ...(e.endereco.complemento ? { xCpl: e.endereco.complemento } : {}),
          xBairro: e.endereco.bairro,
          cMun: e.endereco.codigo_municipio,
          xMun: e.endereco.cidade,
          UF: e.endereco.uf,
          CEP: e.endereco.cep,
          cPais: "1058",
          xPais: "BRASIL",
          ...(e.telefone ? { fone: somenteDigitos(e.telefone) } : {}),
        },
        IE: somenteDigitos(e.inscricao_estadual),
        ...(e.inscricao_municipal ? { IM: e.inscricao_municipal } : {}),
        ...(e.cnae && e.inscricao_municipal ? { CNAE: somenteDigitos(e.cnae) } : {}),
        CRT: regime,
      },
      ...(dest && (docDest.CPF || docDest.CNPJ)
        ? {
            dest: {
              ...docDest,
              xNome: homologacao ? TEXTO_HOMOLOGACAO_NFE : dest.nome.slice(0, 60),
              ...(dest.endereco && !nfce
                ? {
                    enderDest: {
                      xLgr: dest.endereco.logradouro,
                      nro: dest.endereco.numero || "S/N",
                      ...(dest.endereco.complemento ? { xCpl: dest.endereco.complemento } : {}),
                      xBairro: dest.endereco.bairro,
                      cMun: dest.endereco.codigo_municipio,
                      xMun: dest.endereco.cidade,
                      UF: dest.endereco.uf,
                      CEP: dest.endereco.cep,
                      cPais: "1058",
                      xPais: "BRASIL",
                    },
                  }
                : {}),
              indIEDest: dest.inscricao_estadual ? 1 : 9,
              ...(dest.inscricao_estadual ? { IE: somenteDigitos(dest.inscricao_estadual) } : {}),
              ...(dest.email && !nfce ? { email: dest.email } : {}),
            },
          }
        : {}),
      det: det.map(({ _ibs, ...d }) => d),
      total: {
        ICMSTot: {
          vBC: reais(vBC),
          vICMS: reais(vICMS),
          vICMSDeson: 0,
          vFCP: 0,
          vBCST: 0,
          vST: 0,
          vFCPST: 0,
          vFCPSTRet: 0,
          vProd: reais(vProd),
          vFrete: 0,
          vSeg: 0,
          vDesc: reais(vDesc),
          vII: 0,
          vIPI: 0,
          vIPIDevol: 0,
          vPIS: 0,
          vCOFINS: 0,
          vOutro: 0,
          vNF: reais(vNF),
        },
        ...(p.ibscbs.informar
          ? {
              IBSCBSTot: {
                vBCIBSCBS: reais(vNF),
                gIBS: {
                  gIBSUF: { vDif: 0, vDevTrib: 0, vIBSUF: reais(tot.ibsUf) },
                  gIBSMun: { vDif: 0, vDevTrib: 0, vIBSMun: reais(tot.ibsMun) },
                  vIBS: reais(tot.ibsUf + tot.ibsMun),
                  vCredPres: 0,
                  vCredPresCondSus: 0,
                },
                gCBS: { vDif: 0, vDevTrib: 0, vCBS: reais(tot.cbs), vCredPres: 0, vCredPresCondSus: 0 },
              },
            }
          : {}),
      },
      transp: { modFrete: 9 },
      pag: {
        detPag: pagamentos.map((pg) => ({
          indPag: pg.forma === "credito_parcelado" || pg.forma === "boleto" ? 1 : 0,
          tPag: tPag(pg.forma),
          ...(tPag(pg.forma) === "99" ? { xPag: "Outros" } : {}),
          vPag: reais(pg.valor_centavos),
          ...(["03", "04", "17"].includes(tPag(pg.forma)) ? { card: { tpIntegra: 2 } } : {}),
        })),
      },
      ...(p.informacoes_adicionais ? { infAdic: { infCpl: p.informacoes_adicionais.slice(0, 5000) } } : {}),
      ...(p.responsavel_tecnico
        ? {
            infRespTec: {
              CNPJ: p.responsavel_tecnico.cnpj,
              xContato: p.responsavel_tecnico.contato,
              email: p.responsavel_tecnico.email,
              fone: somenteDigitos(p.responsavel_tecnico.telefone),
            },
          }
        : {}),
    },
  };
}

/** Valores de IBS/CBS do pedido (para gravar na nota) */
export function totaisIbsCbs(p: PedidoEmissao) {
  return p.itens.reduce(
    (a, item) => {
      const v = calcularIbsCbs(liquido(item), {
        ibs_uf: p.ibscbs.aliquota_ibs_uf,
        ibs_mun: p.ibscbs.aliquota_ibs_mun,
        cbs: p.ibscbs.aliquota_cbs,
      });
      return { ibs: a.ibs + v.ibs_centavos, cbs: a.cbs + v.cbs_centavos };
    },
    { ibs: 0, cbs: 0 },
  );
}
