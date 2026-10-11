import { listarOrcamentos } from "@/lib/consultas/orcamentos";
import { formatarData, hojeISO } from "@/lib/dominio/datas";
import { formatarPlaca } from "@/lib/dominio/placa";
import { ROTULO_STATUS_ORCAMENTO } from "@/lib/dominio/rotulos";
import { centavosCSV, gerarCSV, respostaCSV } from "@/lib/servidor/csv";
import { obterSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { StatusOrcamento } from "@/lib/supabase/tipos";

export async function GET(request: Request) {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil.papel === "instalador") return new Response("Não autorizado", { status: 401 });
  const params = new URL(request.url).searchParams;
  const status = params.get("status") as StatusOrcamento | null;
  const supabase = await criarClienteServidor();
  const dados = await listarOrcamentos(supabase, { termo: params.get("q") ?? undefined, status: status && status in ROTULO_STATUS_ORCAMENTO ? status : undefined, limite: 20000 });
  const csv = gerarCSV(
    [
      { titulo: "Número", valor: (o) => o.numero },
      { titulo: "Data", valor: (o) => formatarData(o.created_at) },
      { titulo: "Cliente", valor: (o) => o.cliente },
      { titulo: "Placa", valor: (o) => formatarPlaca(o.placa) },
      { titulo: "Veículo", valor: (o) => o.veiculo },
      { titulo: "Validade", valor: (o) => formatarData(o.validade) },
      { titulo: "Total", valor: (o) => centavosCSV(o.total_centavos) },
      { titulo: "Status", valor: (o) => ROTULO_STATUS_ORCAMENTO[o.status] },
    ],
    dados,
  );
  return respostaCSV(`orcamentos-${hojeISO()}.csv`, csv);
}
