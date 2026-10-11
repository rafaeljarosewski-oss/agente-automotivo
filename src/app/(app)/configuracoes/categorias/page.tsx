import { Cabecalho } from "@/components/comum/cabecalho";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaCategorias } from "./lista";

export const metadata = { title: "Categorias de veículo" };

export default async function PaginaCategorias() {
  await exigirSessao("admin");
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("categorias_veiculo").select("*").is("deleted_at", null).order("ordem").order("nome");
  return (
    <>
      <Cabecalho
        titulo="Categorias de veículo"
        descricao="Usadas para definir preços de serviços e da tabela de películas."
        voltar={{ href: "/configuracoes", rotulo: "Configurações" }}
      />
      <ListaCategorias categorias={data ?? []} />
    </>
  );
}
