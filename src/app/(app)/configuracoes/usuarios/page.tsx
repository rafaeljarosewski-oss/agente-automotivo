import { Cabecalho } from "@/components/comum/cabecalho";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { GestaoUsuarios } from "./gestao";

export const metadata = { title: "Usuários" };

export default async function PaginaUsuarios() {
  const sessao = await exigirSessao("admin");
  const supabase = await criarClienteServidor();
  const { data: usuarios } = await supabase.from("perfis").select("*").order("nome");
  return (
    <>
      <Cabecalho
        titulo="Usuários"
        descricao="Administrador: acesso total. Atendente: clientes, orçamentos, OS, caixa e notas. Instalador: apenas as OS atribuídas a ele."
        voltar={{ href: "/configuracoes", rotulo: "Configurações" }}
      />
      <GestaoUsuarios usuarios={usuarios ?? []} usuarioAtual={sessao.usuarioId} />
    </>
  );
}
