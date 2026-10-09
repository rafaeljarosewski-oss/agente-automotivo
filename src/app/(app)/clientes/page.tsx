import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { BotaoCSV } from "@/components/comum/botao-csv";
import { Cabecalho } from "@/components/comum/cabecalho";
import { CampoBusca } from "@/components/comum/campo-busca";
import { Button } from "@/components/ui/button";
import { listarClientes } from "@/lib/consultas/clientes";
import { exigirSessao } from "@/lib/servidor/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TabelaClientes } from "./tabela";

export const metadata = { title: "Clientes" };

export default async function PaginaClientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigirSessao("admin", "atendente");
  const { q } = await searchParams;
  const supabase = await criarClienteServidor();
  const clientes = await listarClientes(supabase, q);
  return (
    <>
      <Cabecalho titulo="Clientes" descricao="Busque por nome, telefone, CPF/CNPJ ou placa.">
        <BotaoCSV href={`/api/csv/clientes${q ? `?q=${encodeURIComponent(q)}` : ""}`} />
        <Button asChild>
          <Link href="/clientes/novo">
            <PlusIcon /> Novo cliente
          </Link>
        </Button>
      </Cabecalho>
      <div className="mb-4">
        <CampoBusca placeholder="Nome, telefone, CPF/CNPJ ou placa" />
      </div>
      <TabelaClientes clientes={clientes} />
    </>
  );
}
