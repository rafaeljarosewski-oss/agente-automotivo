import { notFound, redirect } from "next/navigation";

import { Cabecalho } from "@/components/comum/cabecalho";
import { itensDoBanco } from "@/components/itens/rascunho";
import { carregarCatalogoEditor } from "@/lib/consultas/catalogo";
import { hojeISO, somarDias } from "@/lib/dominio/datas";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { categoriaDoVeiculo, clienteResumo } from "../../dados";
import { EditorOrcamento } from "../../editor";

export const metadata = { title: "Editar orçamento" };

export default async function EditarOrcamento({ params }: { params: Promise<{ id: string }> }) {
  await exigirSessao("admin", "atendente");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: orc } = await supabase.from("orcamentos").select("*, orcamento_itens(*)").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!orc) notFound();
  if (!["rascunho", "enviado", "expirado"].includes(orc.status)) redirect(`/orcamentos/${id}`);
  const [catalogo, cliente, categoriaId] = await Promise.all([
    carregarCatalogoEditor(supabase),
    clienteResumo(supabase, orc.cliente_id),
    categoriaDoVeiculo(supabase, orc.veiculo_id),
  ]);
  const itens = [...orc.orcamento_itens].sort((a, b) => a.ordem - b.ordem);
  return (
    <>
      <Cabecalho titulo={`Editar orçamento nº ${orc.numero}`} voltar={{ href: `/orcamentos/${id}`, rotulo: `Orçamento nº ${orc.numero}` }} />
      <EditorOrcamento
        catalogo={catalogo}
        inicial={{
          id: orc.id,
          cliente,
          veiculoId: orc.veiculo_id,
          categoriaId,
          validade: orc.status === "expirado" ? somarDias(hojeISO(), 7) : orc.validade,
          observacoes: orc.observacoes ?? "",
          descontoTotal: orc.desconto_total_centavos,
          itens: itensDoBanco(itens, false),
        }}
      />
    </>
  );
}
