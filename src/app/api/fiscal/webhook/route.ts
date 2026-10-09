import { envServidor } from "@/lib/env.server";
import { obterProvedorFiscal } from "@/lib/fiscal";
import { CABECALHO_ASSINATURA, verificarAssinatura } from "@/lib/fiscal/assinatura";
import { sincronizarNota } from "@/lib/fiscal/servico";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/**
 * Webhook da API fiscal. Verifica a assinatura HMAC-SHA256 (cabeçalho x-fiscal-signature),
 * registra o evento e sincroniza a nota consultando a API (nunca confia só no corpo recebido).
 */
export async function POST(request: Request) {
  const corpo = await request.text();
  const assinatura = verificarAssinatura(envServidor.fiscal.webhookSecret, corpo, request.headers.get(CABECALHO_ASSINATURA));
  const admin = criarClienteAdmin();
  const provedor = obterProvedorFiscal();

  let json: unknown = null;
  try {
    json = JSON.parse(corpo);
  } catch {
    /* corpo inválido */
  }

  const { data: registro } = await admin
    .from("fiscal_webhook_eventos")
    .insert({ provedor: provedor.nome, assinatura_valida: assinatura.valida, payload: (json ?? { bruto: corpo.slice(0, 2000) }) as never, erro: assinatura.motivo ?? null })
    .select("id")
    .single();

  if (!assinatura.valida) return Response.json({ ok: false, erro: assinatura.motivo }, { status: 401 });

  const evento = provedor.interpretarWebhook(json);
  if (!evento) return Response.json({ ok: true, ignorado: true });

  const { data: nota } = await admin.from("notas_fiscais").select("id").eq("provedor", provedor.nome).eq("provedor_id", evento.provedor_id).maybeSingle();
  if (!nota) return Response.json({ ok: true, ignorado: true });

  const atualizada = await sincronizarNota(nota.id);
  if (registro) await admin.from("fiscal_webhook_eventos").update({ nota_id: nota.id, processado_em: new Date().toISOString() }).eq("id", registro.id);
  return Response.json({ ok: true, status: atualizada?.status });
}
