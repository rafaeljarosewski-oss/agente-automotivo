import { Cabecalho } from "@/components/comum/cabecalho";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormularioEmpresa, FormularioLogo } from "./formulario";

export const metadata = { title: "Dados da empresa" };

export default async function PaginaEmpresa() {
  const { empresa } = await exigirSessao("admin");
  let urlLogo: string | null = null;
  if (empresa.logo_path) {
    const supabase = await criarClienteServidor();
    const { data } = await supabase.storage.from("empresa").createSignedUrl(empresa.logo_path, 3600);
    urlLogo = data?.signedUrl ?? null;
  }
  return (
    <>
      <Cabecalho titulo="Dados da empresa" voltar={{ href: "/configuracoes", rotulo: "Configurações" }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <FormularioEmpresa empresa={empresa} />
        <FormularioLogo urlLogo={urlLogo} />
      </div>
    </>
  );
}
