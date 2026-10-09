import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { BotaoCSV } from "@/components/comum/botao-csv";
import { Cabecalho } from "@/components/comum/cabecalho";
import { CampoBusca } from "@/components/comum/campo-busca";
import { Button } from "@/components/ui/button";
import { listarOS, STATUS_EM_ANDAMENTO } from "@/lib/consultas/os";
import { ROTULO_STATUS_OS } from "@/lib/dominio/rotulos";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { StatusOS } from "@/lib/supabase/tipos";
import { cn } from "@/lib/utils";
import { CartoesOS, TabelaOS } from "./tabela";

export const metadata = { title: "Ordens de serviço" };

export default async function PaginaOS({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sessao = await exigirSessao();
  const instalador = sessao.perfil.papel === "instalador";
  const { q, status } = await searchParams;
  const filtro: StatusOS[] | undefined =
    status === "todas" ? undefined : status && status in ROTULO_STATUS_OS ? [status as StatusOS] : STATUS_EM_ANDAMENTO;
  const supabase = await criarClienteServidor();
  const ordens = await listarOS(supabase, { termo: q, status: filtro });
  const atual = status ?? "andamento";
  const qs = (s?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (s) p.set("status", s);
    return p.toString() ? `?${p}` : "";
  };
  const abas = [
    { id: "andamento", rotulo: "Em andamento", href: `/os${qs()}` },
    ...Object.entries(ROTULO_STATUS_OS).map(([s, r]) => ({ id: s, rotulo: r, href: `/os${qs(s)}` })),
    { id: "todas", rotulo: "Todas", href: `/os${qs("todas")}` },
  ];

  return (
    <>
      <Cabecalho titulo={instalador ? "Minhas ordens de serviço" : "Ordens de serviço"}>
        {!instalador && (
          <>
            <BotaoCSV href={`/api/csv/os${qs(status)}`} />
            <Button asChild>
              <Link href="/os/nova">
                <PlusIcon /> Nova OS
              </Link>
            </Button>
          </>
        )}
      </Cabecalho>
      <div className="mb-4 flex flex-col gap-3">
        {!instalador && <CampoBusca placeholder="Cliente ou número da OS" />}
        <nav className="flex gap-1 overflow-x-auto text-sm" aria-label="Filtrar por status">
          {abas.map((a) => (
            <Link key={a.id} href={a.href} className={cn("rounded-md px-3 py-1.5 whitespace-nowrap", atual === a.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
              {a.rotulo}
            </Link>
          ))}
        </nav>
      </div>
      {instalador ? <CartoesOS ordens={ordens} /> : <TabelaOS ordens={ordens} />}
    </>
  );
}
