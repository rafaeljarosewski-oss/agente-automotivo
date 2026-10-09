import { hojeISO } from "@/lib/dominio/datas";
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
      { titulo: "Unidade", valor: (p) => p.unidade },
      { titulo: "Saldo", valor: (p) => decimalCSV(p.estoque_atual) },
      { titulo: "Mínimo", valor: (p) => decimalCSV(p.estoque_minimo) },
      { titulo: "Abaixo do mínimo", valor: (p) => (p.estoque_minimo > 0 && p.estoque_atual <= p.estoque_minimo ? "Sim" : "Não") },
      { titulo: "Custo unitário", valor: (p) => centavosCSV(p.custo_centavos) },
      { titulo: "Valor em estoque", valor: (p) => centavosCSV(Math.round(Math.max(0, p.estoque_atual) * p.custo_centavos)) },
    ],
    data ?? [],
  );
  return respostaCSV(`estoque-${hojeISO()}.csv`, csv);
}
