import { Cabecalho } from "@/components/comum/cabecalho";
import { exigirSessao } from "@/lib/servidor/sessao";

export default async function Painel() {
  const sessao = await exigirSessao();
  return <Cabecalho titulo={`Olá, ${sessao.perfil.nome.split(" ")[0]}!`} descricao="Painel em construção." />;
}
