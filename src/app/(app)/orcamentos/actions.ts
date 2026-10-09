"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { executarAcao, verificar } from "@/lib/servidor/acao";
import { descontoTotalEmCentavos } from "@/lib/servidor/desconto";
import { prepararItens } from "@/lib/servidor/itens";
import { falha, sucesso } from "@/lib/servidor/resultado";
import { textoOpcional, uuid, uuidOpcional } from "@/lib/validacao/comum";
import { schemaOrcamento, type OrcamentoEntrada } from "@/lib/validacao/orcamento";

export async function salvarOrcamento(entrada: OrcamentoEntrada) {
  const r = await executarAcao({ papeis: ["admin", "atendente"], schema: schemaOrcamento, entrada }, async (d, { supabase, sessao }) => {
    let categoriaId: string | null = null;
    if (d.veiculo_id) {
      const { data: v } = await supabase.from("veiculos").select("cliente_id, categoria_id").eq("id", d.veiculo_id).maybeSingle();
      if (!v || v.cliente_id !== d.cliente_id) return falha("O veículo escolhido não pertence a este cliente.");
      categoriaId = v.categoria_id;
    }

    const itensBase = d.itens.map((i) => ({ quantidade: i.quantidade, preco_unitario_centavos: i.preco_unitario_centavos, desconto_centavos: i.desconto_centavos }));
    const descontoTotal = descontoTotalEmCentavos(itensBase, d.desconto_tipo, d.desconto_valor);
    const { itens, totais } = await prepararItens(supabase, d.itens, categoriaId, descontoTotal);

    const cabecalho = {
      cliente_id: d.cliente_id,
      veiculo_id: d.veiculo_id,
      validade: d.validade,
      observacoes: d.observacoes,
      ...totais,
    };

    let id = d.id;
    if (id) {
      const { data: atual } = await supabase.from("orcamentos").select("status").eq("id", id).is("deleted_at", null).maybeSingle();
      if (!atual) return falha("Orçamento não encontrado.");
      if (!["rascunho", "enviado", "expirado"].includes(atual.status)) return falha("Orçamentos aprovados ou recusados não podem ser alterados.");
      verificar(
        await supabase
          .from("orcamentos")
          .update({ ...cabecalho, status: atual.status === "expirado" ? "rascunho" : atual.status })
          .eq("id", id)
          .select("id")
          .single(),
      );
      verificar(await supabase.from("orcamento_itens").delete().eq("orcamento_id", id));
    } else {
      const numero = verificar(await supabase.rpc("proximo_numero", { p_empresa: sessao.empresa.id, p_chave: "orcamento" }));
      id = verificar(await supabase.from("orcamentos").insert({ ...cabecalho, numero }).select("id").single()).id;
    }

    verificar(
      await supabase.from("orcamento_itens").insert(
        itens.map(({ instalador_id: _i, numeros_serie: _n, ...item }) => ({ ...item, orcamento_id: id! })),
      ),
    );
    revalidatePath("/orcamentos");
    return sucesso({ id: id! }, "Orçamento salvo.");
  });
  if (r.ok) redirect(`/orcamentos/${r.dados.id}`);
  return r;
}

export async function marcarEnviado(id: string) {
  return executarAcao({ papeis: ["admin", "atendente"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    const { data } = await supabase.from("orcamentos").select("status").eq("id", idValido).single();
    if (data?.status === "rascunho") {
      verificar(await supabase.from("orcamentos").update({ status: "enviado", enviado_em: new Date().toISOString() }).eq("id", idValido).select("id").single());
    }
    revalidatePath(`/orcamentos/${idValido}`);
    return sucesso(undefined);
  });
}

export async function aprovarOrcamento(id: string) {
  return executarAcao({ papeis: ["admin", "atendente"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    const { data } = await supabase.from("orcamentos").select("status").eq("id", idValido).single();
    if (!data || !["rascunho", "enviado"].includes(data.status)) return falha("Só é possível aprovar orçamentos em rascunho ou enviados.");
    verificar(await supabase.from("orcamentos").update({ status: "aprovado", aprovado_em: new Date().toISOString() }).eq("id", idValido).select("id").single());
    revalidatePath(`/orcamentos/${idValido}`);
    return sucesso(undefined, "Orçamento aprovado.");
  });
}

const schemaRecusa = z.object({ id: uuid, motivo: textoOpcional });

export async function recusarOrcamento(entrada: z.input<typeof schemaRecusa>) {
  return executarAcao({ papeis: ["admin", "atendente"], schema: schemaRecusa, entrada }, async ({ id, motivo }, { supabase }) => {
    verificar(
      await supabase.from("orcamentos").update({ status: "recusado", recusado_em: new Date().toISOString(), motivo_recusa: motivo }).eq("id", id).select("id").single(),
    );
    revalidatePath(`/orcamentos/${id}`);
    return sucesso(undefined, "Orçamento marcado como recusado.");
  });
}

const schemaGerarOS = z.object({ id: uuid, instalador_id: uuidOpcional });

export async function gerarOS(entrada: z.input<typeof schemaGerarOS>) {
  const r = await executarAcao({ papeis: ["admin", "atendente"], schema: schemaGerarOS, entrada }, async ({ id, instalador_id }, { supabase }) => {
    const osId = verificar(await supabase.rpc("gerar_os_de_orcamento", { p_orcamento: id, p_instalador: instalador_id ?? undefined }));
    revalidatePath("/orcamentos");
    revalidatePath("/os");
    return sucesso({ osId }, "OS criada a partir do orçamento.");
  });
  if (r.ok) redirect(`/os/${r.dados.osId}`);
  return r;
}

export async function excluirOrcamento(id: string) {
  const r = await executarAcao({ papeis: ["admin", "atendente"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    const { data } = await supabase.from("orcamentos").select("status").eq("id", idValido).single();
    if (data?.status === "aprovado") return falha("Orçamentos aprovados não podem ser excluídos.");
    verificar(await supabase.from("orcamentos").update({ deleted_at: new Date().toISOString() }).eq("id", idValido).select("id").single());
    revalidatePath("/orcamentos");
    return sucesso(undefined, "Orçamento excluído.");
  });
  if (r.ok) redirect("/orcamentos");
  return r;
}
