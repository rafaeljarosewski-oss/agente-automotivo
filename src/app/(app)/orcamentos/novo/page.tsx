import { Cabecalho } from "@/components/comum/cabecalho";
import { carregarCatalogoEditor } from "@/lib/consultas/catalogo";
import { hojeISO, somarDias } from "@/lib/dominio/datas";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { categoriaDoVeiculo, clienteResumo } from "../dados";
import { EditorOrcamento } from "../editor";

export const metadata = { title: "Novo orçamento" };

export default async function NovoOrcamento({ searchParams }: { searchParams: Promise<{ cliente?: string; veiculo?: string }> }) {
  await exigirSessao("admin", "atendente");
  const { cliente: clienteId, veiculo } = await searchParams;
  const supabase = await criarClienteServidor();
  const [catalogo, cliente, categoriaId] = await Promise.all([
    carregarCatalogoEditor(supabase),
    clienteResumo(supabase, clienteId),
    categoriaDoVeiculo(supabase, veiculo),
  ]);
  return (
    <>
      <Cabecalho titulo="Novo orçamento" voltar={{ href: "/orcamentos", rotulo: "Orçamentos" }} />
      <EditorOrcamento
        catalogo={catalogo}
        inicial={{
          cliente,
          veiculoId: cliente && veiculo ? veiculo : null,
          categoriaId,
          validade: somarDias(hojeISO(), 7),
          observacoes: "",
          descontoTotal: 0,
          itens: [],
        }}
      />
    </>
  );
}
