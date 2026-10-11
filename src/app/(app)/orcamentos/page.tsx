import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { BotaoCSV } from "@/components/comum/botao-csv";
import { Cabecalho } from "@/components/comum/cabecalho";
import { CampoBusca } from "@/components/comum/campo-busca";
import { Button } from "@/components/ui/button";
import { ROTULO_STATUS_ORCAMENTO } from "@/lib/dominio/rotulos";
import { listarOrcamentos } from "@/lib/consultas/orcamentos";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { StatusOrcamento } from "@/lib/supabase/tipos";
import { cn } from "@/lib/utils";
import { TabelaOrcamentos } from "./tabela";

export const metadata = { title: "Orçamentos" };

export default async function PaginaOrcamentos({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await exigirSessao("admin", "atendente");
  const { q, status } = await searchParams;
  const supabase = await criarClienteServidor();
  await supabase.rpc("expirar_orcamentos");
  const filtroStatus = status && status in ROTULO_STATUS_ORCAMENTO ? (status as StatusOrcamento) : undefined;
  const orcamentos = await listarOrcamentos(supabase, { termo: q, status: filtroStatus });
  const qs = (s?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (s) p.set("status", s);
    return p.toString() ? `?${p}` : "";
  };

  return (
    <>
      <Cabecalho titulo="Orçamentos">
        <BotaoCSV href={`/api/csv/orcamentos${qs(filtroStatus)}`} />
        <Button asChild>
          <Link href="/orcamentos/novo">
            <PlusIcon /> Novo orçamento
          </Link>
        </Button>
      </Cabecalho>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CampoBusca placeholder="Cliente ou número do orçamento" />
        <nav className="flex gap-1 overflow-x-auto text-sm" aria-label="Filtrar por status">
          <Link href={`/orcamentos${qs()}`} className={cn("rounded-md px-3 py-1.5 whitespace-nowrap", !filtroStatus ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
            Todos
          </Link>
          {Object.entries(ROTULO_STATUS_ORCAMENTO).map(([s, r]) => (
            <Link key={s} href={`/orcamentos${qs(s)}`} className={cn("rounded-md px-3 py-1.5 whitespace-nowrap", filtroStatus === s ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
              {r}
            </Link>
          ))}
        </nav>
      </div>
      <TabelaOrcamentos orcamentos={orcamentos} />
    </>
  );
}
