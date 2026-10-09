import Link from "next/link";

import { BotaoCSV } from "@/components/comum/botao-csv";
import { Cabecalho } from "@/components/comum/cabecalho";
import { CampoBusca } from "@/components/comum/campo-busca";
import { listarNotas } from "@/lib/consultas/notas";
import { ROTULO_STATUS_NOTA, ROTULO_TIPO_NOTA } from "@/lib/dominio/rotulos";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { StatusNota, TipoNota } from "@/lib/supabase/tipos";
import { cn } from "@/lib/utils";
import { TabelaNotas } from "./tabela";

export const metadata = { title: "Notas fiscais" };

export default async function PaginaNotas({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; tipo?: string }> }) {
  await exigirSessao("admin", "atendente");
  const { q, status, tipo } = await searchParams;
  const st = status && status in ROTULO_STATUS_NOTA ? (status as StatusNota) : undefined;
  const tp = tipo && tipo in ROTULO_TIPO_NOTA ? (tipo as TipoNota) : undefined;
  const notas = await listarNotas(await criarClienteServidor(), { termo: q, status: st, tipo: tp });
  const link = (mud: { status?: string | null; tipo?: string | null }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const s = mud.status === undefined ? st : mud.status;
    const t = mud.tipo === undefined ? tp : mud.tipo;
    if (s) p.set("status", s);
    if (t) p.set("tipo", t);
    return `/notas${p.toString() ? `?${p}` : ""}`;
  };
  const chip = (ativo: boolean) => cn("rounded-md px-3 py-1.5 whitespace-nowrap", ativo ? "bg-primary text-primary-foreground" : "hover:bg-accent");
  return (
    <>
      <Cabecalho titulo="Notas fiscais" descricao="As notas são emitidas a partir das OS concluídas.">
        <BotaoCSV href={`/api/csv/notas${link({}).replace("/notas", "")}`} />
      </Cabecalho>
      <div className="mb-4 grid gap-3">
        <CampoBusca placeholder="Cliente ou número da nota" />
        <div className="flex flex-wrap gap-1 text-sm">
          <Link href={link({ tipo: null })} className={chip(!tp)}>
            Todos os tipos
          </Link>
          {Object.entries(ROTULO_TIPO_NOTA).map(([t, r]) => (
            <Link key={t} href={link({ tipo: t })} className={chip(tp === t)}>
              {r}
            </Link>
          ))}
          <span className="mx-2 border-l" />
          <Link href={link({ status: null })} className={chip(!st)}>
            Todos
          </Link>
          {Object.entries(ROTULO_STATUS_NOTA)
            .filter(([s]) => s !== "rascunho")
            .map(([s, r]) => (
              <Link key={s} href={link({ status: s })} className={chip(st === s)}>
                {r}
              </Link>
            ))}
        </div>
      </div>
      <TabelaNotas notas={notas} />
    </>
  );
}
