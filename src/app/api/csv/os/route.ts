import { listarOS, STATUS_EM_ANDAMENTO } from "@/lib/consultas/os";
import { formatarData, hojeISO } from "@/lib/dominio/datas";
import { formatarPlaca } from "@/lib/dominio/placa";
import { ROTULO_STATUS_OS } from "@/lib/dominio/rotulos";
import { centavosCSV, gerarCSV, respostaCSV } from "@/lib/servidor/csv";
import { obterSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { StatusOS } from "@/lib/supabase/tipos";

export async function GET(request: Request) {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil.papel === "instalador") return new Response("Não autorizado", { status: 401 });
  const params = new URL(request.url).searchParams;
  const s = params.get("status");
  const status = s === "todas" ? undefined : s && s in ROTULO_STATUS_OS ? [s as StatusOS] : STATUS_EM_ANDAMENTO;
  const dados = await listarOS(await criarClienteServidor(), { termo: params.get("q") ?? undefined, status, limite: 20000 });
  const csv = gerarCSV(
    [
      { titulo: "Número", valor: (o) => o.numero },
      { titulo: "Abertura", valor: (o) => formatarData(o.created_at) },
      { titulo: "Conclusão", valor: (o) => formatarData(o.concluida_em) },
      { titulo: "Cliente", valor: (o) => o.cliente },
      { titulo: "Placa", valor: (o) => formatarPlaca(o.placa) },
      { titulo: "Veículo", valor: (o) => o.veiculo },
      { titulo: "Instalador", valor: (o) => o.instalador },
      { titulo: "Total", valor: (o) => centavosCSV(o.total_centavos) },
      { titulo: "Status", valor: (o) => ROTULO_STATUS_OS[o.status] },
    ],
    dados,
  );
  return respostaCSV(`ordens-de-servico-${hojeISO()}.csv`, csv);
}
