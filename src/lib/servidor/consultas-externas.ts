import { normalizarDocumento, somenteDigitos } from "@/lib/dominio/documentos";

/**
 * Consultas a serviços públicos: endereço por CEP (ViaCEP, com BrasilAPI como alternativa)
 * e dados de empresa por CNPJ (BrasilAPI). Falhas retornam null — o usuário preenche à mão.
 * Sem segredos: também é usado pelo script `npm run empresa:nova`.
 */

export interface EnderecoConsultado {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  codigo_municipio: string | null;
}

export interface EmpresaConsultada {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  email: string | null;
  telefone: string | null;
  cnae: string | null;
  simples: boolean | null;
  mei: boolean | null;
  endereco: Omit<EnderecoConsultado, "complemento"> & { numero: string; complemento: string };
}

async function buscarJson(url: string, timeoutMs = 6000): Promise<unknown | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: "application/json" }, cache: "no-store" });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export async function consultarCEP(cep: string): Promise<EnderecoConsultado | null> {
  const d = somenteDigitos(cep);
  if (d.length !== 8) return null;

  const via = (await buscarJson(`https://viacep.com.br/ws/${d}/json/`)) as Record<string, string> | null;
  if (via && !("erro" in via)) {
    return {
      cep: d,
      logradouro: via.logradouro ?? "",
      complemento: via.complemento ?? "",
      bairro: via.bairro ?? "",
      cidade: via.localidade ?? "",
      uf: via.uf ?? "",
      codigo_municipio: via.ibge ?? null,
    };
  }

  const br = (await buscarJson(`https://brasilapi.com.br/api/cep/v2/${d}`)) as Record<string, string> | null;
  if (br && br.city) {
    return {
      cep: d,
      logradouro: br.street ?? "",
      complemento: "",
      bairro: br.neighborhood ?? "",
      cidade: br.city ?? "",
      uf: br.state ?? "",
      codigo_municipio: null,
    };
  }
  return null;
}

export async function consultarCNPJ(cnpj: string): Promise<EmpresaConsultada | null> {
  const doc = normalizarDocumento(cnpj);
  if (doc.length !== 14) return null;
  const r = (await buscarJson(`https://brasilapi.com.br/api/cnpj/v1/${doc}`, 10000)) as Record<string, unknown> | null;
  if (!r || !r.razao_social) return null;
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const tipoLogradouro = s(r.descricao_tipo_de_logradouro);
  const logradouro = s(r.logradouro);
  return {
    cnpj: doc,
    razao_social: s(r.razao_social),
    nome_fantasia: s(r.nome_fantasia),
    email: r.email ? s(r.email).toLowerCase() : null,
    telefone: r.ddd_telefone_1 ? somenteDigitos(s(r.ddd_telefone_1)) : null,
    cnae: r.cnae_fiscal ? s(r.cnae_fiscal) : null,
    simples: typeof r.opcao_pelo_simples === "boolean" ? r.opcao_pelo_simples : null,
    mei: typeof r.opcao_pelo_mei === "boolean" ? r.opcao_pelo_mei : null,
    endereco: {
      cep: somenteDigitos(s(r.cep)),
      logradouro: tipoLogradouro && !logradouro.toUpperCase().startsWith(tipoLogradouro.toUpperCase()) ? `${tipoLogradouro} ${logradouro}` : logradouro,
      numero: s(r.numero),
      complemento: s(r.complemento),
      bairro: s(r.bairro),
      cidade: s(r.municipio),
      uf: s(r.uf),
      codigo_municipio: r.codigo_municipio_ibge ? s(r.codigo_municipio_ibge) : null,
    },
  };
}
