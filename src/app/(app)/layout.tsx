import { Shell } from "@/components/layout/shell";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();
  let ambiente: "homologacao" | "producao" | null = null;
  if (sessao.perfil.papel === "admin") {
    const supabase = await criarClienteServidor();
    const { data } = await supabase.from("empresa_config_fiscal").select("ambiente").maybeSingle();
    ambiente = data?.ambiente ?? null;
  }
  return (
    <Shell
      nomeUsuario={sessao.perfil.nome}
      papel={sessao.perfil.papel}
      nomeEmpresa={sessao.empresa.nome_fantasia ?? sessao.empresa.razao_social}
      ambienteFiscal={ambiente}
    >
      {children}
    </Shell>
  );
}
