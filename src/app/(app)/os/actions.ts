"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { executarAcao, verificar } from "@/lib/servidor/acao";
import { calcularConclusao } from "@/lib/servidor/conclusao";
import { descontoTotalEmCentavos } from "@/lib/servidor/desconto";
import { prepararItens } from "@/lib/servidor/itens";
import { falha, sucesso } from "@/lib/servidor/resultado";
import { textoOpcional, uuid } from "@/lib/validacao/comum";
import { schemaConclusao, schemaOS, type ConclusaoEntrada, type OSEntrada } from "@/lib/validacao/os";

const EDITAVEIS = ["aberta", "em_execucao", "aguardando_peca"];

export async function salvarOS(entrada: OSEntrada) {
  const r = await executarAcao({ papeis: ["admin", "atendente"], schema: schemaOS, entrada }, async (d, { supabase, sessao }) => {
    let categoriaId: string | null = null;
    if (d.veiculo_id) {
      const { data: v } = await supabase.from("veiculos").select("cliente_id, categoria_id").eq("id", d.veiculo_id).maybeSingle();
      if (!v || v.cliente_id !== d.cliente_id) return falha("O veículo escolhido não pertence a este cliente.");
      categoriaId = v.categoria_id;
    }
    const base = d.itens.map((i) => ({ quantidade: i.quantidade, preco_unitario_centavos: i.preco_unitario_centavos, desconto_centavos: i.desconto_centavos }));
    const descontoTotal = descontoTotalEmCentavos(base, d.desconto_tipo, d.desconto_valor);
    const { itens, totais } = await prepararItens(supabase, d.itens, categoriaId, descontoTotal);

    const cabecalho = {
      cliente_id: d.cliente_id,
      veiculo_id: d.veiculo_id,
      instalador_id: d.instalador_id,
      previsao_entrega: d.previsao_entrega ? new Date(d.previsao_entrega).toISOString() : null,
      km: d.km,
      forma_pagamento: d.forma_pagamento ?? null,
      parcelas: d.forma_pagamento === "credito_parcelado" || d.forma_pagamento === "boleto" ? d.parcelas : 1,
      observacoes: d.observacoes,
      observacoes_internas: d.observacoes_internas,
      ...totais,
    };

    let id = d.id;
    if (id) {
      const { data: atual } = await supabase.from("ordens_servico").select("status").eq("id", id).is("deleted_at", null).maybeSingle();
      if (!atual) return falha("OS não encontrada.");
      if (!EDITAVEIS.includes(atual.status)) return falha("OS concluída, entregue ou cancelada não pode ser alterada.");
      verificar(await supabase.from("ordens_servico").update(cabecalho).eq("id", id).select("id").single());
      verificar(await supabase.from("os_itens").delete().eq("os_id", id));
    } else {
      const numero = verificar(await supabase.rpc("proximo_numero", { p_empresa: sessao.empresa.id, p_chave: "os" }));
      id = verificar(await supabase.from("ordens_servico").insert({ ...cabecalho, numero }).select("id, empresa_id").single()).id;
      await supabase.from("os_historico").insert({ empresa_id: sessao.empresa.id, os_id: id, status_novo: "aberta", observacao: "OS criada" });
    }
    verificar(await supabase.from("os_itens").insert(itens.map((i) => ({ ...i, os_id: id! }))));
    revalidatePath("/os");
    return sucesso({ id: id! }, "OS salva.");
  });
  if (r.ok) redirect(`/os/${r.dados.id}`);
  return r;
}

const schemaStatus = z.object({
  id: uuid,
  status: z.enum(["aberta", "em_execucao", "aguardando_peca", "entregue", "cancelada"]),
  observacao: textoOpcional,
});

export async function alterarStatus(entrada: z.input<typeof schemaStatus>) {
  return executarAcao({ schema: schemaStatus, entrada }, async ({ id, status, observacao }, { supabase }) => {
    verificar(await supabase.rpc("alterar_status_os", { p_os: id, p_status: status, p_observacao: observacao ?? undefined }));
    revalidatePath(`/os/${id}`);
    revalidatePath("/os");
    return sucesso(undefined, "Status atualizado.");
  });
}

/** Prévia das parcelas e comissões antes de concluir */
export async function previaConclusao(entrada: ConclusaoEntrada) {
  return executarAcao({ schema: schemaConclusao, entrada }, async ({ id, forma_pagamento, parcelas }, { supabase }) => {
    const r = await calcularConclusao(supabase, id, forma_pagamento, parcelas);
    if (!r) return falha("OS não encontrada.");
    return sucesso(r);
  });
}

export async function concluirOS(entrada: ConclusaoEntrada) {
  return executarAcao({ schema: schemaConclusao, entrada }, async ({ id, forma_pagamento, parcelas, series }, { supabase }) => {
    const calc = await calcularConclusao(supabase, id, forma_pagamento, parcelas);
    if (!calc) return falha("OS não encontrada.");
    verificar(
      await supabase.rpc("concluir_os", {
        p_os: id,
        p_parcelas: calc.parcelas as never,
        p_comissoes: calc.comissoes as never,
        p_series: series as never,
      }),
    );
    revalidatePath(`/os/${id}`);
    revalidatePath("/os");
    return sucesso(undefined, "OS concluída! Estoque baixado e contas a receber geradas.");
  });
}

export async function excluirOS(id: string) {
  const r = await executarAcao({ papeis: ["admin", "atendente"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    const { data } = await supabase.from("ordens_servico").select("status").eq("id", idValido).single();
    if (data?.status !== "aberta" && data?.status !== "cancelada") return falha("Só é possível excluir OS abertas ou canceladas.");
    verificar(await supabase.from("ordens_servico").update({ deleted_at: new Date().toISOString() }).eq("id", idValido).select("id").single());
    revalidatePath("/os");
    return sucesso(undefined, "OS excluída.");
  });
  if (r.ok) redirect("/os");
  return r;
}
