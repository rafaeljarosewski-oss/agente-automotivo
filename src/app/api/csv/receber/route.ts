import { listarReceber, type FiltroTitulo } from "@/lib/consultas/financeiro";
import { formatarData, hojeISO } from "@/lib/dominio/datas";
import { ROTULO_FORMA_PAGAMENTO, ROTULO_STATUS_TITULO } from "@/lib/dominio/rotulos";
import { centavosCSV, gerarCSV, respostaCSV } from "@/lib/servidor/csv";
import { obterSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil.papel === "instalador") return new Response("Não autorizado", { status: 401 });
  const f = (new URL(request.url).searchParams.get("filtro") ?? "todos") as FiltroTitulo;
  const dados = await listarReceber(await criarClienteServidor(), ["abertos", "vencidos", "pagos", "todos"].includes(f) ? f : "todos", 50000);
  const csv = gerarCSV(
    [
      { titulo: "Descrição", valor: (t) => t.descricao },
      { titulo: "Cliente", valor: (t) => t.cliente },
      { titulo: "OS", valor: (t) => t.os_numero },
      { titulo: "Parcela", valor: (t) => `${t.parcela}/${t.total_parcelas}` },
      { titulo: "Vencimento", valor: (t) => formatarData(t.vencimento) },
      { titulo: "Valor", valor: (t) => centavosCSV(t.valor_centavos) },
      { titulo: "Situação", valor: (t) => (t.vencido ? "Vencido" : ROTULO_STATUS_TITULO[t.status]) },
      { titulo: "Recebido em", valor: (t) => formatarData(t.pago_em) },
      { titulo: "Valor recebido", valor: (t) => centavosCSV(t.valor_pago_centavos) },
      { titulo: "Forma", valor: (t) => (t.forma_pagamento_baixa ?? t.forma_pagamento ? ROTULO_FORMA_PAGAMENTO[(t.forma_pagamento_baixa ?? t.forma_pagamento)!] : "") },
    ],
    dados,
  );
  return respostaCSV(`contas-a-receber-${hojeISO()}.csv`, csv);
}
