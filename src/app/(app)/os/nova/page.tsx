import { Cabecalho } from "@/components/comum/cabecalho";
import { carregarCatalogoEditor } from "@/lib/consultas/catalogo";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { categoriaDoVeiculo, clienteResumo } from "../../orcamentos/dados";
import { EditorOS } from "../editor";

export const metadata = { title: "Nova OS" };

export default async function NovaOS({ searchParams }: { searchParams: Promise<{ cliente?: string; veiculo?: string }> }) {
  await exigirSessao("admin", "atendente");
  const { cliente: clienteId, veiculo } = await searchParams;
  const supabase = await criarClienteServidor();
  const [catalogo, cliente, categoriaId, { data: instaladores }] = await Promise.all([
    carregarCatalogoEditor(supabase),
    clienteResumo(supabase, clienteId),
    categoriaDoVeiculo(supabase, veiculo),
    supabase.from("perfis").select("id, nome").eq("papel", "instalador").eq("ativo", true).order("nome"),
  ]);
  return (
    <>
      <Cabecalho titulo="Nova ordem de serviço" voltar={{ href: "/os", rotulo: "Ordens de serviço" }} />
      <EditorOS
        catalogo={catalogo}
        instaladores={instaladores ?? []}
        inicial={{
          cliente,
          veiculoId: cliente && veiculo ? veiculo : null,
          categoriaId,
          instaladorId: null,
          previsao: "",
          km: "",
          formaPagamento: "",
          parcelas: 1,
          observacoes: "",
          observacoesInternas: "",
          descontoTotal: 0,
          itens: [],
        }}
      />
    </>
  );
}
