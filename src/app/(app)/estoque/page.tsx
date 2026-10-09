import Link from "next/link";
import { FileUpIcon } from "lucide-react";

import { BotaoCSV } from "@/components/comum/botao-csv";
import { Cabecalho } from "@/components/comum/cabecalho";
import { CampoBusca } from "@/components/comum/campo-busca";
import { Button } from "@/components/ui/button";
import { normalizarBusca } from "@/lib/dominio/texto";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { TabelaEstoque } from "./tabela";

export const metadata = { title: "Estoque" };

export default async function PaginaEstoque({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string }> }) {
  const sessao = await exigirSessao("admin", "atendente");
  const { q, filtro } = await searchParams;
  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("produtos")
    .select("id, nome, codigo, categoria, unidade, tipo_controle, estoque_atual, estoque_minimo, custo_centavos, exige_numero_serie")
    .is("deleted_at", null)
    .eq("ativo", true)
    .order("nome")
    .limit(2000);
  if (q) consulta = consulta.ilike("busca", `%${normalizarBusca(q)}%`);
  const { data } = await consulta;
  const produtos = (data ?? []).map((p) => ({ ...p, estoque_atual: Number(p.estoque_atual), estoque_minimo: Number(p.estoque_minimo) }));
  const baixos = produtos.filter((p) => p.estoque_minimo > 0 && p.estoque_atual <= p.estoque_minimo);
  const lista = filtro === "baixo" ? baixos : produtos;
  const valorEstoque = produtos.reduce((s, p) => s + Math.max(0, p.estoque_atual) * p.custo_centavos, 0);

  return (
    <>
      <Cabecalho titulo="Estoque" descricao="Saldos, rolos de película, entradas e ajustes.">
        <BotaoCSV href="/api/csv/estoque" />
        {sessao.perfil.papel === "admin" && (
          <Button asChild>
            <Link href="/estoque/importar">
              <FileUpIcon /> Importar XML de compra
            </Link>
          </Button>
        )}
      </Cabecalho>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CampoBusca placeholder="Buscar produto" />
        <div className="flex gap-1 text-sm">
          <Link href={`/estoque${q ? `?q=${encodeURIComponent(q)}` : ""}`} className={cn("rounded-md px-3 py-1.5", filtro !== "baixo" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
            Todos ({produtos.length})
          </Link>
          <Link href={`/estoque?filtro=baixo${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("rounded-md px-3 py-1.5", filtro === "baixo" ? "bg-destructive text-white" : "hover:bg-accent")}>
            Abaixo do mínimo ({baixos.length})
          </Link>
        </div>
      </div>
      <TabelaEstoque produtos={lista} valorEstoque={valorEstoque} />
    </>
  );
}
