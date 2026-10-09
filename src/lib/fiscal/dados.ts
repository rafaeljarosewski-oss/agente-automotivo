import type { Tabela } from "@/lib/supabase/tipos";
import type { ConfiguracaoEmpresaFiscal, EmitenteFiscal } from "./tipos";

/** Converte o cadastro da empresa no emitente fiscal */
export function emitenteDaEmpresa(e: Tabela<"empresas">): EmitenteFiscal {
  return {
    cnpj: e.cnpj,
    razao_social: e.razao_social,
    nome_fantasia: e.nome_fantasia,
    inscricao_estadual: e.inscricao_estadual,
    inscricao_municipal: e.inscricao_municipal,
    regime: e.regime_tributario,
    cnae: e.cnae,
    telefone: e.telefone,
    email: e.email,
    endereco: {
      logradouro: e.logradouro ?? "",
      numero: e.numero ?? "",
      complemento: e.complemento,
      bairro: e.bairro ?? "",
      cidade: e.cidade ?? "",
      uf: e.uf ?? "",
      cep: e.cep ?? "",
      codigo_municipio: e.codigo_municipio ?? "",
    },
  };
}

export function configuracaoParaApi(
  empresa: Tabela<"empresas">,
  c: Tabela<"empresa_config_fiscal">,
  csc: string | null,
): ConfiguracaoEmpresaFiscal {
  return {
    ambiente: c.ambiente,
    regime: empresa.regime_tributario,
    nfse: {
      serie: c.nfse_serie,
      proximo_numero: c.nfse_proximo_numero,
      regime_especial: c.nfse_regime_especial,
      incentivo_fiscal: c.nfse_incentivo_fiscal,
    },
    ...(c.nfce_csc_id && csc ? { nfce: { serie: c.nfce_serie, proximo_numero: c.nfce_proximo_numero, csc_id: c.nfce_csc_id, csc } } : {}),
    nfe: { serie: c.nfe_serie, proximo_numero: c.nfe_proximo_numero },
  };
}
