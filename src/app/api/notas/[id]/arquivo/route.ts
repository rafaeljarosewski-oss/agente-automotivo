import { arquivoDaNota } from "@/lib/fiscal/arquivos";
import { obterSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil.papel === "instalador") return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo");
  // Lê com o cliente do usuário: o RLS garante que a nota é da empresa dele
  const supabase = await criarClienteServidor();
  const { data: nota } = await supabase.from("notas_fiscais").select("*").eq("id", id).maybeSingle();
  if (!nota) return new Response("Nota não encontrada", { status: 404 });
  if (tipo === "evento") {
    const { data: evento } = await supabase.from("notas_eventos").select("pdf_path").eq("id", url.searchParams.get("evento") ?? "").eq("nota_id", id).maybeSingle();
    if (!evento?.pdf_path) return new Response("PDF do evento não disponível", { status: 404 });
    const { data } = await supabase.storage.from("empresa").download(evento.pdf_path);
    if (!data) return new Response("PDF do evento não disponível", { status: 404 });
    return new Response(data, { headers: { "Content-Type": "application/pdf", "Cache-Control": "private, no-store" } });
  }
  if (tipo !== "xml" && tipo !== "pdf") return new Response("Tipo inválido", { status: 400 });
  return arquivoDaNota(nota, tipo);
}
