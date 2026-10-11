import Link from "next/link";

import { BotaoCSV } from "@/components/comum/botao-csv";
import { Cabecalho } from "@/components/comum/cabecalho";
import { Card, CardContent } from "@/components/ui/card";
import { listarPagar, type FiltroTitulo } from "@/lib/consultas/financeiro";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { BotaoNovaConta, TabelaPagar } from "./tabela";

export const metadata = { title: "Contas a pagar" };

const FILTROS: { id: FiltroTitulo; rotulo: string }[] = [
  { id: "abertos", rotulo: "Em aberto" },
  { id: "vencidos", rotulo: "Vencidas" },
  { id: "pagos", rotulo: "Pagas" },
  { id: "todos", rotulo: "Todas" },
];

export default async function PaginaPagar({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  await exigirSessao("admin");
  const { filtro: f } = await searchParams;
  const filtro = (FILTROS.find((x) => x.id === f)?.id ?? "abertos") as FiltroTitulo;
  const supabase = await criarClienteServidor();
  const [contas, { data: categorias }] = await Promise.all([
    listarPagar(supabase, filtro),
    supabase.from("categorias_financeiras").select("id, nome").eq("tipo", "despesa").is("deleted_at", null).order("nome"),
  ]);
  const abertas = contas.filter((c) => c.status === "aberto");
  return (
    <>
      <Cabecalho titulo="Contas a pagar">
        <BotaoCSV href={`/api/csv/pagar?filtro=${filtro}`} />
        <BotaoNovaConta categorias={categorias ?? []} />
      </Cabecalho>
      {filtro !== "pagos" && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Card className="gap-1 py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">Em aberto (filtro atual)</p>
              <p className="text-xl font-semibold">{formatarMoeda(abertas.reduce((s, c) => s + c.valor_centavos, 0))}</p>
            </CardContent>
          </Card>
          <Card className="gap-1 py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">Vencidas</p>
              <p className="text-xl font-semibold text-destructive">{formatarMoeda(abertas.filter((c) => c.vencido).reduce((s, c) => s + c.valor_centavos, 0))}</p>
            </CardContent>
          </Card>
        </div>
      )}
      <nav className="mb-4 flex gap-1 overflow-x-auto text-sm">
        {FILTROS.map((x) => (
          <Link key={x.id} href={`/financeiro/pagar?filtro=${x.id}`} className={cn("rounded-md px-3 py-1.5 whitespace-nowrap", filtro === x.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
            {x.rotulo}
          </Link>
        ))}
      </nav>
      <TabelaPagar contas={contas} categorias={categorias ?? []} />
    </>
  );
}
