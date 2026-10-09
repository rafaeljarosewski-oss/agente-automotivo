import { listarNotas } from "@/lib/consultas/notas";
import { formatarDataHora, hojeISO } from "@/lib/dominio/datas";
import { ROTULO_STATUS_NOTA, ROTULO_TIPO_NOTA } from "@/lib/dominio/rotulos";
import { centavosCSV, gerarCSV, respostaCSV } from "@/lib/servidor/csv";
import { obterSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { StatusNota, TipoNota } from "@/lib/supabase/tipos";

export async function GET(request: Request) {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil.papel === "instalador") return new Response("Não autorizado", { status: 401 });
  const p = new URL(request.url).searchParams;
  const status = p.get("status") as StatusNota | null;
  const tipo = p.get("tipo") as TipoNota | null;
  const notas = await listarNotas(await criarClienteServidor(), {
    termo: p.get("q") ?? undefined,
    status: status && status in ROTULO_STATUS_NOTA ? status : undefined,
    tipo: tipo && tipo in ROTULO_TIPO_NOTA ? tipo : undefined,
    inicio: p.get("inicio") ?? undefined,
    fim: p.get("fim") ?? undefined,
    limite: 50000,
  });
  const csv = gerarCSV(
    [
      { titulo: "Tipo", valor: (n) => ROTULO_TIPO_NOTA[n.tipo] },
      { titulo: "Número", valor: (n) => n.numero },
      { titulo: "Série", valor: (n) => n.serie },
      { titulo: "Emissão", valor: (n) => formatarDataHora(n.data_emissao ?? n.created_at) },
      { titulo: "Cliente", valor: (n) => n.cliente },
      { titulo: "OS", valor: (n) => n.os_numero },
      { titulo: "Valor", valor: (n) => centavosCSV(n.valor_total_centavos) },
      { titulo: "IBS", valor: (n) => centavosCSV(n.valor_ibs_centavos) },
      { titulo: "CBS", valor: (n) => centavosCSV(n.valor_cbs_centavos) },
      { titulo: "Situação", valor: (n) => ROTULO_STATUS_NOTA[n.status] },
      { titulo: "Ambiente", valor: (n) => (n.ambiente === "producao" ? "Produção" : "Homologação") },
      { titulo: "Chave", valor: (n) => n.chave },
    ],
    notas,
  );
  return respostaCSV(`notas-fiscais-${hojeISO()}.csv`, csv);
}
