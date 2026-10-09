"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { cancelarNota, emitirCartaCorrecao, emitirNotasDaOS, planejarNotas, reenviarNota, sincronizarNota } from "@/lib/fiscal/servico";
import { executarAcao } from "@/lib/servidor/acao";
import { falha, sucesso } from "@/lib/servidor/resultado";
import { uuid } from "@/lib/validacao/comum";

const PAPEIS = ["admin", "atendente"] as const;

const schemaEmissao = z.object({ os_id: uuid, tipo_produtos: z.enum(["nfce", "nfe"]).optional() });

export async function previaNotas(entrada: z.input<typeof schemaEmissao>) {
  return executarAcao({ papeis: [...PAPEIS], schema: schemaEmissao, entrada }, async ({ os_id, tipo_produtos }, { supabase, sessao }) => {
    const { data: os } = await supabase.from("ordens_servico").select("id").eq("id", os_id).maybeSingle();
    if (!os) return falha("OS não encontrada.");
    return sucesso(await planejarNotas(sessao.empresa.id, os_id, tipo_produtos));
  });
}

export async function emitirNotas(entrada: z.input<typeof schemaEmissao>) {
  return executarAcao({ papeis: [...PAPEIS], schema: schemaEmissao, entrada }, async ({ os_id, tipo_produtos }, { supabase, sessao }) => {
    // Confere pelo RLS que a OS é da empresa do usuário antes de usar a camada fiscal
    const { data: os } = await supabase.from("ordens_servico").select("id").eq("id", os_id).maybeSingle();
    if (!os) return falha("OS não encontrada.");
    const notas = await emitirNotasDaOS(sessao.empresa.id, sessao.usuarioId, os_id, tipo_produtos);
    revalidatePath(`/os/${os_id}`);
    revalidatePath("/notas");
    const comErro = notas.filter((n) => n.status === "erro" || n.status === "rejeitada").length;
    return sucesso(
      notas.map((n) => n.id),
      comErro ? `${notas.length} nota(s) enviada(s); ${comErro} com problema — veja o motivo na lista.` : `${notas.length} nota(s) enviada(s) para autorização.`,
    );
  });
}

export async function atualizarStatusNota(id: string) {
  return executarAcao({ papeis: [...PAPEIS], schema: uuid, entrada: id }, async (notaId, { sessao }) => {
    const nota = await sincronizarNota(notaId, sessao.empresa.id);
    if (!nota) return falha("Nota não encontrada.");
    return sucesso({ status: nota.status });
  });
}

export async function reenviar(id: string) {
  return executarAcao({ papeis: [...PAPEIS], schema: uuid, entrada: id }, async (notaId, { sessao }) => {
    const nota = await reenviarNota(notaId, sessao.empresa.id);
    revalidatePath(`/notas/${notaId}`);
    return nota.status === "erro" || nota.status === "rejeitada"
      ? falha(nota.motivo_amigavel ?? "A nota continua com problema.")
      : sucesso(undefined, "Nota reenviada.");
  });
}

const schemaTexto = z.object({ id: uuid, texto: z.string().trim().min(15, "Escreva pelo menos 15 caracteres.").max(1000) });

export async function cancelar(entrada: z.input<typeof schemaTexto>) {
  return executarAcao({ papeis: ["admin"], schema: schemaTexto, entrada }, async ({ id, texto }, { sessao }) => {
    const r = await cancelarNota(id, sessao.empresa.id, texto, sessao.usuarioId);
    revalidatePath(`/notas/${id}`);
    return sucesso(undefined, r.status === "registrado" ? "Nota cancelada." : "Cancelamento enviado; aguardando confirmação.");
  });
}

export async function cartaCorrecao(entrada: z.input<typeof schemaTexto>) {
  return executarAcao({ papeis: [...PAPEIS], schema: schemaTexto, entrada }, async ({ id, texto }, { sessao }) => {
    await emitirCartaCorrecao(id, sessao.empresa.id, texto, sessao.usuarioId);
    revalidatePath(`/notas/${id}`);
    return sucesso(undefined, "Carta de correção registrada.");
  });
}
