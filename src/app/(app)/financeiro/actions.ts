"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { somarMeses } from "@/lib/dominio/datas";
import { dividirCentavos } from "@/lib/dominio/dinheiro";
import { executarAcao, verificar } from "@/lib/servidor/acao";
import { falha, sucesso } from "@/lib/servidor/resultado";
import { dataISO, dinheiro, dinheiroOpcional, textoObrigatorio, textoOpcional, uuid, uuidOpcional } from "@/lib/validacao/comum";
import { formasPagamento } from "@/lib/validacao/os";

const PAPEIS = ["admin", "atendente"] as const;
const forma = z.enum(formasPagamento, { error: "Escolha a forma de pagamento." });

function revalidar() {
  revalidatePath("/financeiro", "layout");
  revalidatePath("/");
}

// ---------------------------------------------------------------- caixa
export async function abrirCaixa(entrada: { valor: string }) {
  return executarAcao({ papeis: [...PAPEIS], schema: z.object({ valor: dinheiroOpcional }), entrada }, async ({ valor }, { supabase }) => {
    verificar(await supabase.rpc("abrir_caixa", { p_valor_abertura: valor }));
    revalidar();
    return sucesso(undefined, "Caixa aberto.");
  });
}

const schemaMovimento = z.object({ tipo: z.enum(["sangria", "reforco"]), valor: dinheiro("o valor"), descricao: textoObrigatorio("o motivo") });

export async function movimentarCaixa(entrada: z.input<typeof schemaMovimento>) {
  return executarAcao({ papeis: [...PAPEIS], schema: schemaMovimento, entrada }, async (d, { supabase }) => {
    verificar(await supabase.rpc("movimentar_caixa", { p_tipo: d.tipo, p_valor: d.valor, p_descricao: d.descricao }));
    revalidar();
    return sucesso(undefined, d.tipo === "sangria" ? "Sangria registrada." : "Reforço registrado.");
  });
}

const schemaFechamento = z.object({ conferencia: z.record(z.string(), dinheiroOpcional), observacoes: textoOpcional });

export async function fecharCaixa(entrada: z.input<typeof schemaFechamento>) {
  return executarAcao({ papeis: [...PAPEIS], schema: schemaFechamento, entrada }, async (d, { supabase }) => {
    verificar(await supabase.rpc("fechar_caixa", { p_conferencia: d.conferencia, p_observacoes: d.observacoes ?? undefined }));
    revalidar();
    return sucesso(undefined, "Caixa fechado.");
  });
}

// ---------------------------------------------------------------- receber
const schemaBaixa = z.object({ id: uuid, valor: dinheiro("o valor recebido"), forma, data: dataISO });

export async function receberTitulo(entrada: z.input<typeof schemaBaixa>) {
  return executarAcao({ papeis: [...PAPEIS], schema: schemaBaixa, entrada }, async (d, { supabase }) => {
    verificar(await supabase.rpc("baixar_conta_receber", { p_conta: d.id, p_valor_pago: d.valor, p_forma: d.forma, p_data: `${d.data}T12:00:00-03:00` }));
    revalidar();
    return sucesso(undefined, "Recebimento registrado.");
  });
}

const schemaNovoReceber = z.object({ descricao: textoObrigatorio("a descrição"), cliente_id: uuidOpcional, valor: dinheiro("o valor"), vencimento: dataISO, forma: forma.nullable().optional() });

export async function novoTituloReceber(entrada: z.input<typeof schemaNovoReceber>) {
  return executarAcao({ papeis: [...PAPEIS], schema: schemaNovoReceber, entrada }, async (d, { supabase }) => {
    if (d.valor <= 0) return falha("Informe um valor maior que zero.");
    verificar(
      await supabase.from("contas_receber").insert({ descricao: d.descricao, cliente_id: d.cliente_id, valor_centavos: d.valor, vencimento: d.vencimento, forma_pagamento: d.forma ?? null }).select("id").single(),
    );
    revalidar();
    return sucesso(undefined, "Conta a receber lançada.");
  });
}

export async function cancelarTituloReceber(id: string) {
  return executarAcao({ papeis: ["admin"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    verificar(await supabase.from("contas_receber").update({ status: "cancelado" }).eq("id", idValido).eq("status", "aberto").select("id").single());
    revalidar();
    return sucesso(undefined, "Título cancelado.");
  });
}

// ---------------------------------------------------------------- pagar
const schemaPagar = z.object({
  id: uuidOpcional,
  categoria_id: uuidOpcional,
  fornecedor: textoOpcional,
  descricao: textoObrigatorio("a descrição"),
  documento: textoOpcional,
  valor: dinheiro("o valor"),
  vencimento: dataISO,
  parcelas: z.coerce.number().int().min(1).max(36).default(1),
  observacoes: textoOpcional,
});

export async function salvarContaPagar(entrada: z.input<typeof schemaPagar>) {
  return executarAcao({ papeis: ["admin"], schema: schemaPagar, entrada }, async (d, { supabase }) => {
    if (d.valor <= 0) return falha("Informe um valor maior que zero.", { valor: "Valor inválido." });
    const base = { categoria_id: d.categoria_id, fornecedor: d.fornecedor, documento: d.documento, observacoes: d.observacoes };
    if (d.id) {
      verificar(await supabase.from("contas_pagar").update({ ...base, descricao: d.descricao, valor_centavos: d.valor, vencimento: d.vencimento }).eq("id", d.id).eq("status", "aberto").select("id").single());
    } else {
      const valores = dividirCentavos(d.valor, d.parcelas);
      verificar(
        await supabase.from("contas_pagar").insert(
          valores.map((v, i) => ({
            ...base,
            descricao: d.parcelas > 1 ? `${d.descricao} (${i + 1}/${d.parcelas})` : d.descricao,
            valor_centavos: v,
            vencimento: somarMeses(d.vencimento, i),
          })),
        ),
      );
    }
    revalidar();
    return sucesso(undefined, d.id ? "Conta atualizada." : "Conta a pagar lançada.");
  });
}

const schemaPagamento = z.object({ id: uuid, valor: dinheiro("o valor pago"), forma, data: dataISO });

export async function pagarConta(entrada: z.input<typeof schemaPagamento>) {
  return executarAcao({ papeis: ["admin"], schema: schemaPagamento, entrada }, async (d, { supabase }) => {
    verificar(await supabase.rpc("pagar_conta_pagar", { p_conta: d.id, p_valor_pago: d.valor, p_forma: d.forma, p_data: `${d.data}T12:00:00-03:00` }));
    revalidar();
    return sucesso(undefined, "Pagamento registrado.");
  });
}

export async function excluirContaPagar(id: string) {
  return executarAcao({ papeis: ["admin"], schema: uuid, entrada: id }, async (idValido, { supabase }) => {
    verificar(await supabase.from("contas_pagar").update({ deleted_at: new Date().toISOString() }).eq("id", idValido).select("id").single());
    revalidar();
    return sucesso(undefined, "Conta excluída.");
  });
}
