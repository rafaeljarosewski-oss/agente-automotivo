import { envServidor } from "@/lib/env.server";
import { sincronizarPendentes } from "@/lib/fiscal/servico";

/** Consulta periódica de segurança das notas em processamento (Vercel Cron envia "Authorization: Bearer <CRON_SECRET>") */
export async function GET(request: Request) {
  const segredo = envServidor.cronSecret;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const r = await sincronizarPendentes();
  return Response.json({ ok: true, ...r });
}
