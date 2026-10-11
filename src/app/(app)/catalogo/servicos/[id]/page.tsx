import { notFound } from "next/navigation";

import { Cabecalho } from "@/components/comum/cabecalho";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormularioServico } from "../formulario";

export const metadata = { title: "Serviço" };

export default async function PaginaServico({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao("admin", "atendente");
  const { id } = await params;
  const somenteLeitura = sessao.perfil.papel !== "admin";
  const supabase = await criarClienteServidor();
  const [{ data: categorias }, { data: rolos }] = await Promise.all([
    supabase.from("categorias_veiculo").select("id, nome").is("deleted_at", null).eq("ativo", true).order("ordem"),
    supabase.from("produtos").select("id, nome").is("deleted_at", null).eq("tipo_controle", "metro").order("nome"),
  ]);
  if (id === "novo") {
    if (somenteLeitura) notFound();
    return (
      <>
        <Cabecalho titulo="Novo serviço" voltar={{ href: "/catalogo?aba=servicos", rotulo: "Catálogo" }} />
        <FormularioServico categorias={categorias ?? []} rolos={rolos ?? []} precos={[]} somenteLeitura={false} />
      </>
    );
  }
  const { data: servico } = await supabase.from("servicos").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!servico) notFound();
  const { data: precos } = await supabase.from("servico_precos_categoria").select("categoria_id, preco_centavos").eq("servico_id", id);
  return (
    <>
      <Cabecalho titulo={servico.nome} descricao={servico.codigo ?? undefined} voltar={{ href: "/catalogo?aba=servicos", rotulo: "Catálogo" }} />
      <FormularioServico servico={servico} categorias={categorias ?? []} rolos={rolos ?? []} precos={precos ?? []} somenteLeitura={somenteLeitura} />
    </>
  );
}
