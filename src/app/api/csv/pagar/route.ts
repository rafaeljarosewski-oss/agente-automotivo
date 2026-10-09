import { listarPagar, type FiltroTitulo } from "@/lib/consultas/financeiro";
import { formatarData, hojeISO } from "@/lib/dominio/datas";
import { ROTULO_FORMA_PAGAMENTO, ROTULO_STATUS_TITULO } from "@/lib/dominio/rotulos";
import { centavosCSV, gerarCSV, respostaCSV } from "@/lib/servidor/csv";
import { obterSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil.papel !== "admin") return new Response("Não autorizado", { status: 401 });
  const f = (new URL(request.url).searchParams.get("filtro") ?? "todos") as FiltroTitulo;
  const dados = await listarPagar(await criarClienteServidor(), ["abertos", "vencidos", "pagos", "todos"].includes(f) ? f : "todos", 50000);
  const csv = gerarCSV(
    [
      { titulo: "Descrição", valor: (t) => t.descricao },
      { titulo: "Fornecedor", valor: (t) => t.fornecedor },
      { titulo: "Categoria", valor: (t) => t.categoria },
      { titulo: "Documento", valor: (t) => t.documento },
      { titulo: "Vencimento", valor: (t) => formatarData(t.vencimento) },
      { titulo: "Valor", valor: (t) => centavosCSV(t.valor_centavos) },
      { titulo: "Situação", valor: (t) => (t.vencido ? "Vencida" : ROTULO_STATUS_TITULO[t.status]) },
      { titulo: "Pago em", valor: (t) => formatarData(t.pago_em) },
      { titulo: "Forma", valor: (t) => (t.forma_pagamento ? ROTULO_FORMA_PAGAMENTO[t.forma_pagamento] : "") },
    ],
    dados,
  );
  return respostaCSV(`contas-a-pagar-${hojeISO()}.csv`, csv);
}
