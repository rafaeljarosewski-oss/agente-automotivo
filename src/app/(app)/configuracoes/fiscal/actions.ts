"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { obterProvedorFiscal } from "@/lib/fiscal";
import { configuracaoParaApi, emitenteDaEmpresa } from "@/lib/fiscal/dados";
import { executarAcao, verificar } from "@/lib/servidor/acao";
import { criptografar, descriptografar } from "@/lib/servidor/cripto";
import { traduzirErro } from "@/lib/servidor/erros";
import { falha, sucesso } from "@/lib/servidor/resultado";
import type { Sessao } from "@/lib/servidor/sessao";
import type { ClienteSupabase } from "@/lib/supabase/server";
import type { AtualizaLinha } from "@/lib/supabase/tipos";
import { decimal, decimalOpcional, inteiroOpcional, textoObrigatorio, textoOpcional } from "@/lib/validacao/comum";

const inteiroPositivo = (rotulo: string) =>
  z.coerce.number({ error: `Informe ${rotulo}.` }).int(`Informe ${rotulo} sem casas decimais.`).min(1, `Informe ${rotulo}.`);

const schema = z.object({
  ambiente: z.enum(["homologacao", "producao"]),
  nfse_serie: textoObrigatorio("a série da NFS-e"),
  nfse_proximo_numero: inteiroPositivo("o próximo número da NFS-e"),
  nfse_provedor: z.enum(["auto", "nacional", "padrao"]),
  nfse_codigo_tributacao_municipal: textoOpcional,
  nfse_aliquota_iss: decimalOpcional,
  nfse_regime_especial: inteiroOpcional,
  nfse_incentivo_fiscal: z.boolean(),
  nfce_serie: inteiroPositivo("a série da NFC-e"),
  nfce_proximo_numero: inteiroPositivo("o próximo número da NFC-e"),
  nfce_csc_id: inteiroOpcional,
  nfce_csc: textoOpcional, // em branco = mantém o atual
  nfe_serie: inteiroPositivo("a série da NF-e"),
  nfe_proximo_numero: inteiroPositivo("o próximo número da NF-e"),
  natureza_operacao: textoObrigatorio("a natureza da operação"),
  informar_ibs_cbs: z.boolean(),
  aliquota_ibs_uf: decimal("a alíquota do IBS estadual", { maxCasas: 4 }),
  aliquota_ibs_mun: decimal("a alíquota do IBS municipal", { maxCasas: 4 }),
  aliquota_cbs: decimal("a alíquota da CBS", { maxCasas: 4 }),
});

export type ConfigFiscalEntrada = z.input<typeof schema>;

/** Envia empresa e configurações para a API fiscal. Retorna mensagem de erro ou null. */
async function sincronizarComApi(supabase: ClienteSupabase, sessao: Sessao): Promise<string | null> {
  const { data: config } = await supabase.from("empresa_config_fiscal").select("*").single();
  if (!config) return "Configuração fiscal não encontrada.";
  try {
    const provedor = obterProvedorFiscal();
    await provedor.registrarEmpresa(emitenteDaEmpresa(sessao.empresa));
    const csc = config.nfce_csc_cifrado ? descriptografar(config.nfce_csc_cifrado) : null;
    await provedor.configurarEmpresa(sessao.empresa.cnpj, configuracaoParaApi(sessao.empresa, config, csc));
    await supabase
      .from("empresa_config_fiscal")
      .update({ empresa_cadastrada_api: true, ultima_sincronizacao_api: new Date().toISOString() })
      .eq("empresa_id", sessao.empresa.id);
    return null;
  } catch (e) {
    return traduzirErro(e);
  }
}

export async function salvarConfigFiscal(entrada: ConfigFiscalEntrada) {
  return executarAcao({ papeis: ["admin"], schema, entrada }, async ({ nfce_csc, ...dados }, { supabase, sessao }) => {
    const atualizacao: AtualizaLinha<"empresa_config_fiscal"> = { ...dados };
    if (nfce_csc) atualizacao.nfce_csc_cifrado = criptografar(nfce_csc);
    verificar(await supabase.from("empresa_config_fiscal").update(atualizacao).eq("empresa_id", sessao.empresa.id).select("empresa_id").single());
    const erroApi = await sincronizarComApi(supabase, sessao);
    revalidatePath("/", "layout");
    if (erroApi) return sucesso(undefined, `Configuração salva, mas não foi possível atualizar a API fiscal: ${erroApi}`);
    return sucesso(undefined, "Configuração fiscal salva e enviada para a API fiscal.");
  });
}

export async function enviarCertificado(formData: FormData) {
  return executarAcao({ papeis: ["admin"], schema: z.object({}), entrada: {} }, async (_d, { supabase, sessao }) => {
    const arquivo = formData.get("certificado");
    const senha = String(formData.get("senha") ?? "");
    if (!(arquivo instanceof File) || arquivo.size === 0) return falha("Selecione o arquivo do certificado (.pfx ou .p12).");
    if (!/\.(pfx|p12)$/i.test(arquivo.name)) return falha("O certificado A1 deve ser um arquivo .pfx ou .p12.");
    if (arquivo.size > 5 * 1024 * 1024) return falha("Arquivo muito grande para um certificado A1.");
    if (!senha) return falha("Informe a senha do certificado.");

    try {
      const provedor = obterProvedorFiscal();
      await provedor.registrarEmpresa(emitenteDaEmpresa(sessao.empresa));
      // O arquivo e a senha vão direto para a API fiscal e NÃO são gravados no nosso banco
      const info = await provedor.enviarCertificado(sessao.empresa.cnpj, new Uint8Array(await arquivo.arrayBuffer()), senha);
      verificar(
        await supabase
          .from("empresa_config_fiscal")
          .update({
            certificado_enviado_em: new Date().toISOString(),
            certificado_validade: info.validade ?? null,
            certificado_titular: info.titular ?? null,
            certificado_serial: info.serial ?? null,
            empresa_cadastrada_api: true,
          })
          .eq("empresa_id", sessao.empresa.id)
          .select("empresa_id")
          .single(),
      );
    } catch (e) {
      const msg = traduzirErro(e);
      return falha(/senha|password/i.test(msg) ? "Senha do certificado incorreta." : `Não foi possível enviar o certificado: ${msg}`);
    }
    revalidatePath("/configuracoes/fiscal");
    return sucesso(undefined, "Certificado enviado para a API fiscal.");
  });
}

export async function verificarMunicipio() {
  return executarAcao({ papeis: ["admin"], schema: z.object({}), entrada: {} }, async (_d, { sessao }) => {
    const ibge = sessao.empresa.codigo_municipio;
    if (!ibge) return falha("Cadastre o endereço da empresa com o código IBGE do município.");
    try {
      const m = await obterProvedorFiscal().consultarMunicipio(ibge);
      if (!m) return falha("Município não atendido pela API fiscal para NFS-e.");
      return sucesso(m, m.nacional ? "O município usa o padrão nacional da NFS-e." : `O município usa o provedor "${m.provedor}".`);
    } catch (e) {
      return falha(traduzirErro(e));
    }
  });
}

export async function sincronizarApi() {
  return executarAcao({ papeis: ["admin"], schema: z.object({}), entrada: {} }, async (_d, { supabase, sessao }) => {
    const erro = await sincronizarComApi(supabase, sessao);
    revalidatePath("/configuracoes/fiscal");
    return erro ? falha(erro) : sucesso(undefined, "Empresa e configurações enviadas para a API fiscal.");
  });
}
