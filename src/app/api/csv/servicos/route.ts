import { hojeISO } from "@/lib/dominio/datas";
import { ROTULO_CATEGORIA_SERVICO, ROTULO_TIPO_PRECO, rotulo } from "@/lib/dominio/rotulos";
import { centavosCSV, gerarCSV, respostaCSV } from "@/lib/servidor/csv";
import { obterSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil.papel === "instalador") return new Response("Não autorizado", { status: 401 });
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("servicos").select("*").is("deleted_at", null).order("nome");
  const csv = gerarCSV(
    [
      { titulo: "Código", valor: (s) => s.codigo },
      { titulo: "Serviço", valor: (s) => s.nome },
      { titulo: "Categoria", valor: (s) => rotulo(ROTULO_CATEGORIA_SERVICO, s.categoria) },
      { titulo: "Cobrança", valor: (s) => rotulo(ROTULO_TIPO_PRECO, s.tipo_preco) },
      { titulo: "Preço", valor: (s) => centavosCSV(s.preco_centavos) },
      { titulo: "Comissão", valor: (s) => (s.comissao_tipo === "percentual" ? `${s.comissao_percentual}%` : s.comissao_tipo === "fixo" ? centavosCSV(s.comissao_fixo_centavos) : "") },
      { titulo: "Código LC 116", valor: (s) => s.codigo_servico },
      { titulo: "Alíquota ISS", valor: (s) => s.aliquota_iss },
      { titulo: "Fiscal validado", valor: (s) => (s.fiscal_validado ? "Sim" : "Não") },
      { titulo: "Ativo", valor: (s) => (s.ativo ? "Sim" : "Não") },
    ],
    data ?? [],
  );
  return respostaCSV(`servicos-${hojeISO()}.csv`, csv);
}
