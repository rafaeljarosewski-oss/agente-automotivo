import { pdfOrcamento, respostaPdf } from "@/lib/pdf/gerar";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Link público (sem login): acesso somente pelo token aleatório do orçamento
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return new Response("Link inválido", { status: 404 });
  const r = await pdfOrcamento(criarClienteAdmin(), { token });
  if (!r) return new Response("Orçamento não encontrado", { status: 404 });
  return respostaPdf(r.buffer, `orcamento-${r.numero}.pdf`);
}
