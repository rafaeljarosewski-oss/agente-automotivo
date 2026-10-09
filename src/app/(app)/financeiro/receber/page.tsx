import Link from "next/link";

import { BotaoCSV } from "@/components/comum/botao-csv";
import { Cabecalho } from "@/components/comum/cabecalho";
import { CampoBusca } from "@/components/comum/campo-busca";
import { Card, CardContent } from "@/components/ui/card";
import { listarReceber, type FiltroTitulo } from "@/lib/consultas/financeiro";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { normalizarBusca } from "@/lib/dominio/texto";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { NovoTituloReceber, TabelaReceber } from "./tabela";

export const metadata = { title: "Contas a receber" };

const FILTROS: { id: FiltroTitulo; rotulo: string }[] = [
  { id: "abertos", rotulo: "Em aberto" },
  { id: "vencidos", rotulo: "Vencidos" },
  { id: "pagos", rotulo: "Recebidos" },
  { id: "todos", rotulo: "Todos" },
];

export default async function PaginaReceber({ searchParams }: { searchParams: Promise<{ filtro?: string; q?: string }> }) {
  const sessao = await exigirSessao("admin", "atendente");
  const { filtro: f, q } = await searchParams;
  const filtro = (FILTROS.find((x) => x.id === f)?.id ?? "abertos") as FiltroTitulo;
  const supabase = await criarClienteServidor();
  const [todos, { data: caixa }] = await Promise.all([listarReceber(supabase, filtro), supabase.rpc("caixa_aberto")]);
  // Busca por cliente, nº da OS ou descrição (sobre a lista já filtrada por status)
  const termo = normalizarBusca(q ?? "");
  const titulos = termo ? todos.filter((t) => normalizarBusca(`${t.cliente ?? ""} ${t.os_numero ?? ""} ${t.descricao}`).includes(termo)) : todos;
  const abertos = titulos.filter((t) => t.status === "aberto");
  const totalAberto = abertos.reduce((s, t) => s + t.valor_centavos, 0);
  const totalVencido = abertos.filter((t) => t.vencido).reduce((s, t) => s + t.valor_centavos, 0);

  return (
    <>
      <Cabecalho titulo="Contas a receber" descricao="Geradas automaticamente na conclusão das OS.">
        <BotaoCSV href={`/api/csv/receber?filtro=${filtro}`} />
        <NovoTituloReceber />
      </Cabecalho>
      {filtro !== "pagos" && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Card className="gap-1 py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">Em aberto (filtro atual)</p>
              <p className="text-xl font-semibold">{formatarMoeda(totalAberto)}</p>
            </CardContent>
          </Card>
          <Card className="gap-1 py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">Vencidos</p>
              <p className={cn("text-xl font-semibold", totalVencido > 0 && "text-destructive")}>{formatarMoeda(totalVencido)}</p>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-1 overflow-x-auto text-sm">
          {FILTROS.map((x) => (
            <Link
              key={x.id}
              href={`/financeiro/receber?filtro=${x.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={cn("rounded-md px-3 py-1.5 whitespace-nowrap", filtro === x.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            >
              {x.rotulo}
            </Link>
          ))}
        </nav>
        <CampoBusca placeholder="Buscar por cliente ou nº da OS" className="sm:max-w-xs" />
      </div>
      <TabelaReceber titulos={titulos} caixaAberto={Boolean(caixa)} podeCancelar={sessao.perfil.papel === "admin"} />
    </>
  );
}
