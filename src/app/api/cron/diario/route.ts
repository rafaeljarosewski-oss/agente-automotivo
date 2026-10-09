import { envServidor } from "@/lib/env.server";
import { sincronizarPendentes } from "@/lib/fiscal/servico";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/** Rotina diária: expira orçamentos vencidos (de todas as empresas) e faz uma sincronização fiscal completa */
export async function GET(request: Request) {
  const segredo = envServidor.cronSecret;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const admin = criarClienteAdmin();
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const { data } = await admin
    .from("orcamentos")
    .update({ status: "expirado" })
    .in("status", ["rascunho", "enviado"])
    .lt("validade", hoje)
    .is("deleted_at", null)
    .select("id");
  const fiscal = await sincronizarPendentes(200);
  return Response.json({ ok: true, orcamentos_expirados: data?.length ?? 0, fiscal });
}
