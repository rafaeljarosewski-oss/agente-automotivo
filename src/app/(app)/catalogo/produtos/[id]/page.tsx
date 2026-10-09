import { notFound } from "next/navigation";

import { Cabecalho } from "@/components/comum/cabecalho";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormularioProduto } from "../formulario";

export const metadata = { title: "Produto" };

export default async function PaginaProduto({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao("admin", "atendente");
  const { id } = await params;
  const somenteLeitura = sessao.perfil.papel !== "admin";
  if (id === "novo") {
    if (somenteLeitura) notFound();
    return (
      <>
        <Cabecalho titulo="Novo produto" voltar={{ href: "/catalogo?aba=produtos", rotulo: "Catálogo" }} />
        <FormularioProduto somenteLeitura={false} />
      </>
    );
  }
  const supabase = await criarClienteServidor();
  const { data: produto } = await supabase.from("produtos").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!produto) notFound();
  return (
    <>
      <Cabecalho titulo={produto.nome} descricao={produto.codigo ?? undefined} voltar={{ href: "/catalogo?aba=produtos", rotulo: "Catálogo" }} />
      <FormularioProduto produto={produto} somenteLeitura={somenteLeitura} />
    </>
  );
}
