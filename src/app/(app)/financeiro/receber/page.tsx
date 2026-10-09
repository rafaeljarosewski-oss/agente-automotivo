import Link from "next/link";

import { BotaoCSV } from "@/components/comum/botao-csv";
import { Cabecalho } from "@/components/comum/cabecalho";
import { Card, CardContent } from "@/components/ui/card";
import { listarReceber, type FiltroTitulo } from "@/lib/consultas/financeiro";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
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

export default async function PaginaReceber({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const sessao = await exigirSessao("admin", "atendente");
  const { filtro: f } = await searchParams;
  const filtro = (FILTROS.find((x) => x.id === f)?.id ?? "abertos") as FiltroTitulo;
  const supabase = await criarClienteServidor();
  const [titulos, { data: caixa }] = await Promise.all([listarReceber(supabase, filtro), supabase.rpc("caixa_aberto")]);
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
      <nav className="mb-4 flex gap-1 overflow-x-auto text-sm">
        {FILTROS.map((x) => (
          <Link key={x.id} href={`/financeiro/receber?filtro=${x.id}`} className={cn("rounded-md px-3 py-1.5 whitespace-nowrap", filtro === x.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
            {x.rotulo}
          </Link>
        ))}
      </nav>
      <TabelaReceber titulos={titulos} caixaAberto={Boolean(caixa)} podeCancelar={sessao.perfil.papel === "admin"} />
    </>
  );
}
