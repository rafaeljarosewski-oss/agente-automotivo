import { periodoPadrao, relatorioComissoes, relatorioFaturamento, relatorioNotas, relatorioVendidos } from "@/lib/consultas/relatorios";
import { formatarData, formatarDataHora } from "@/lib/dominio/datas";
import { ROTULO_STATUS_NOTA, ROTULO_TIPO_NOTA } from "@/lib/dominio/rotulos";
import { centavosCSV, decimalCSV, gerarCSV, respostaCSV } from "@/lib/servidor/csv";
import { obterSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil.papel !== "admin") return new Response("Não autorizado", { status: 401 });
  const { tipo } = await params;
  const sp = new URL(request.url).searchParams;
  const { inicio, fim } = periodoPadrao(sp.get("inicio") ?? undefined, sp.get("fim") ?? undefined);
  const supabase = await criarClienteServidor();
  const nome = `relatorio-${tipo}-${inicio}-a-${fim}.csv`;

  if (tipo === "faturamento") {
    const d = await relatorioFaturamento(supabase, inicio, fim);
    return respostaCSV(nome, gerarCSV([
      { titulo: "Dia", valor: (l) => formatarData(l.dia) },
      { titulo: "OS concluídas", valor: (l) => l.quantidade_os },
      { titulo: "Faturado", valor: (l) => centavosCSV(l.faturado_centavos) },
      { titulo: "Recebido", valor: (l) => centavosCSV(l.recebido_centavos) },
    ], d));
  }
  if (tipo === "vendidos") {
    const d = await relatorioVendidos(supabase, inicio, fim);
    return respostaCSV(nome, gerarCSV([
      { titulo: "Tipo", valor: (l) => (l.tipo === "servico" ? "Serviço" : "Produto") },
      { titulo: "Item", valor: (l) => l.descricao },
      { titulo: "Quantidade", valor: (l) => decimalCSV(l.quantidade) },
      { titulo: "Total", valor: (l) => centavosCSV(l.total_centavos) },
      { titulo: "Nº de OS", valor: (l) => l.qtd_os },
    ], d));
  }
  if (tipo === "comissoes") {
    const d = await relatorioComissoes(supabase, inicio, fim);
    return respostaCSV(nome, gerarCSV([
      { titulo: "Instalador", valor: (l) => l.instalador_nome },
      { titulo: "OS", valor: (l) => l.quantidade_os },
      { titulo: "Itens", valor: (l) => l.quantidade_itens },
      { titulo: "Base", valor: (l) => centavosCSV(l.base_centavos) },
      { titulo: "Comissão", valor: (l) => centavosCSV(l.comissao_centavos) },
    ], d));
  }
  if (tipo === "notas") {
    const d = await relatorioNotas(supabase, inicio, fim);
    return respostaCSV(nome, gerarCSV([
      { titulo: "Tipo", valor: (n) => ROTULO_TIPO_NOTA[n.tipo] },
      { titulo: "Número", valor: (n) => n.numero },
      { titulo: "Data", valor: (n) => formatarDataHora(n.data_emissao ?? n.created_at) },
      { titulo: "Cliente", valor: (n) => n.cliente },
      { titulo: "Valor", valor: (n) => centavosCSV(n.valor_total_centavos) },
      { titulo: "IBS", valor: (n) => centavosCSV(n.valor_ibs_centavos) },
      { titulo: "CBS", valor: (n) => centavosCSV(n.valor_cbs_centavos) },
      { titulo: "Situação", valor: (n) => ROTULO_STATUS_NOTA[n.status] },
      { titulo: "Chave", valor: (n) => n.chave },
    ], d));
  }
  return new Response("Relatório inexistente", { status: 404 });
}
