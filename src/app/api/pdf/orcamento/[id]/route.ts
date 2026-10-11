import { pdfOrcamento, respostaPdf } from "@/lib/pdf/gerar";
import { obterSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await obterSessao())) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const r = await pdfOrcamento(await criarClienteServidor(), { id });
  if (!r) return new Response("Orçamento não encontrado", { status: 404 });
  return respostaPdf(r.buffer, `orcamento-${r.numero}.pdf`);
}
