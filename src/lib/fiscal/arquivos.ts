import "server-only";

import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Tabela } from "@/lib/supabase/tipos";
import { obterProvedorFiscal } from "./index";

/** Download do XML/PDF da nota: primeiro do Storage; se ainda não estiver lá, busca na API fiscal e guarda */
export async function arquivoDaNota(nota: Tabela<"notas_fiscais">, tipo: "xml" | "pdf"): Promise<Response> {
  const admin = criarClienteAdmin();
  const caminho = tipo === "xml" ? nota.xml_path : nota.pdf_path;
  let conteudo: Uint8Array | null = null;
  if (caminho) {
    const { data } = await admin.storage.from("empresa").download(caminho);
    if (data) conteudo = new Uint8Array(await data.arrayBuffer());
  }
  if (!conteudo && nota.provedor_id && ["autorizada", "cancelada"].includes(nota.status)) {
    const provedor = obterProvedorFiscal();
    conteudo = tipo === "xml" ? await provedor.baixarXml(nota.tipo, nota.provedor_id) : await provedor.baixarPdf(nota.tipo, nota.provedor_id);
    const novo = `${nota.empresa_id}/notas/${nota.id}/${nota.tipo}-${nota.numero ?? "sn"}.${tipo}`;
    const up = await admin.storage.from("empresa").upload(novo, conteudo, { contentType: tipo === "xml" ? "application/xml" : "application/pdf", upsert: true });
    if (!up.error) await admin.from("notas_fiscais").update(tipo === "xml" ? { xml_path: novo } : { pdf_path: novo }).eq("id", nota.id);
  }
  if (!conteudo) return new Response("Arquivo ainda não disponível.", { status: 404 });
  const nome = `${nota.tipo}-${nota.numero ?? nota.id.slice(0, 8)}.${tipo}`;
  return new Response(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": tipo === "xml" ? "application/xml; charset=utf-8" : "application/pdf",
      "Content-Disposition": `${tipo === "xml" ? "attachment" : "inline"}; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
