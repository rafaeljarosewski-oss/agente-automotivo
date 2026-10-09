import { Cabecalho } from "@/components/comum/cabecalho";
import { exigirSessao } from "@/lib/servidor/sessao";
import { ImportadorXml } from "./importador";

export const metadata = { title: "Importar XML de compra" };

export default async function PaginaImportar() {
  await exigirSessao("admin");
  return (
    <>
      <Cabecalho
        titulo="Importar XML de NF-e de compra"
        descricao="Lê os itens da nota do fornecedor, casa com os produtos cadastrados (código, código de barras ou descrição) e lança as entradas no estoque."
        voltar={{ href: "/estoque", rotulo: "Estoque" }}
      />
      <ImportadorXml />
    </>
  );
}
