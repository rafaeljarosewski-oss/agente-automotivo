import { notFound, redirect } from "next/navigation";

import { Cabecalho } from "@/components/comum/cabecalho";
import { itensDoBanco } from "@/components/itens/rascunho";
import { carregarCatalogoEditor } from "@/lib/consultas/catalogo";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { categoriaDoVeiculo, clienteResumo } from "../../../orcamentos/dados";
import { EditorOS } from "../../editor";

export const metadata = { title: "Editar OS" };

function paraDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - 3 * 3600_000); // America/Sao_Paulo (sem horário de verão)
  return local.toISOString().slice(0, 16);
}

export default async function EditarOS({ params }: { params: Promise<{ id: string }> }) {
  await exigirSessao("admin", "atendente");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: os } = await supabase.from("ordens_servico").select("*, os_itens(*)").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!os) notFound();
  if (!["aberta", "em_execucao", "aguardando_peca"].includes(os.status)) redirect(`/os/${id}`);
  const [catalogo, cliente, categoriaId, { data: instaladores }] = await Promise.all([
    carregarCatalogoEditor(supabase),
    clienteResumo(supabase, os.cliente_id),
    categoriaDoVeiculo(supabase, os.veiculo_id),
    supabase.from("perfis").select("id, nome").eq("papel", "instalador").eq("ativo", true).order("nome"),
  ]);
  return (
    <>
      <Cabecalho titulo={`Editar OS nº ${os.numero}`} voltar={{ href: `/os/${id}`, rotulo: `OS nº ${os.numero}` }} />
      <EditorOS
        catalogo={catalogo}
        instaladores={instaladores ?? []}
        inicial={{
          id: os.id,
          cliente,
          veiculoId: os.veiculo_id,
          categoriaId,
          instaladorId: os.instalador_id,
          previsao: paraDatetimeLocal(os.previsao_entrega),
          km: os.km ? String(os.km) : "",
          formaPagamento: os.forma_pagamento ?? "",
          parcelas: os.parcelas,
          observacoes: os.observacoes ?? "",
          observacoesInternas: os.observacoes_internas ?? "",
          descontoTotal: os.desconto_total_centavos,
          itens: itensDoBanco([...os.os_itens].sort((a, b) => a.ordem - b.ordem), false),
        }}
      />
    </>
  );
}
