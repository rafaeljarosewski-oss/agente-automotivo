import { arquivoDaNota } from "@/lib/fiscal/arquivos";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return new Response("Link inválido", { status: 404 });
  const { data: nota } = await criarClienteAdmin().from("notas_fiscais").select("*").eq("token_publico", token).in("status", ["autorizada", "cancelada"]).maybeSingle();
  if (!nota) return new Response("Nota não encontrada", { status: 404 });
  const tipo = new URL(request.url).searchParams.get("tipo") === "xml" ? "xml" : "pdf";
  return arquivoDaNota(nota, tipo);
}
