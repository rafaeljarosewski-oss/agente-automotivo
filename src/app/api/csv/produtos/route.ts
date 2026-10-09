import { hojeISO } from "@/lib/dominio/datas";
import { ROTULO_CATEGORIA_PRODUTO, rotulo } from "@/lib/dominio/rotulos";
import { centavosCSV, decimalCSV, gerarCSV, respostaCSV } from "@/lib/servidor/csv";
import { obterSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil.papel === "instalador") return new Response("Não autorizado", { status: 401 });
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("produtos").select("*").is("deleted_at", null).order("nome");
  const csv = gerarCSV(
    [
      { titulo: "Código", valor: (p) => p.codigo },
      { titulo: "Produto", valor: (p) => p.nome },
      { titulo: "Categoria", valor: (p) => rotulo(ROTULO_CATEGORIA_PRODUTO, p.categoria) },
      { titulo: "Marca", valor: (p) => p.marca },
      { titulo: "Unidade", valor: (p) => p.unidade },
      { titulo: "Preço de venda", valor: (p) => centavosCSV(p.preco_venda_centavos) },
      { titulo: "Custo", valor: (p) => centavosCSV(p.custo_centavos) },
      { titulo: "Estoque atual", valor: (p) => decimalCSV(p.estoque_atual) },
      { titulo: "Estoque mínimo", valor: (p) => decimalCSV(p.estoque_minimo) },
      { titulo: "NCM", valor: (p) => p.ncm },
      { titulo: "CFOP", valor: (p) => p.cfop },
      { titulo: "CSOSN", valor: (p) => p.csosn },
      { titulo: "Código de barras", valor: (p) => p.codigo_barras },
      { titulo: "Fiscal validado", valor: (p) => (p.fiscal_validado ? "Sim" : "Não") },
      { titulo: "Ativo", valor: (p) => (p.ativo ? "Sim" : "Não") },
    ],
    data ?? [],
  );
  return respostaCSV(`produtos-${hojeISO()}.csv`, csv);
}
