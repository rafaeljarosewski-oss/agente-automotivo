import { Cabecalho } from "@/components/comum/cabecalho";
import { envServidor } from "@/lib/env.server";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormularioFiscal } from "./formulario";

export const metadata = { title: "Configurações fiscais" };

export default async function PaginaFiscal() {
  const { empresa } = await exigirSessao("admin");
  const supabase = await criarClienteServidor();
  const { data: config } = await supabase.from("empresa_config_fiscal").select("*").single();
  if (!config) throw new Error("Configuração fiscal não encontrada.");
  const { nfce_csc_cifrado, ...publica } = config;
  return (
    <>
      <Cabecalho
        titulo="Configurações fiscais"
        descricao="Tudo funciona primeiro em homologação. A troca para produção é feita aqui, quando o contador liberar."
        voltar={{ href: "/configuracoes", rotulo: "Configurações" }}
      />
      <FormularioFiscal
        config={publica}
        cscConfigurado={Boolean(nfce_csc_cifrado)}
        provedor={envServidor.fiscal.provedor}
        enderecoCompleto={Boolean(empresa.codigo_municipio && empresa.logradouro && empresa.cep)}
      />
    </>
  );
}
