"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangleIcon } from "lucide-react";

import { TabelaDados } from "@/components/comum/tabela-dados";
import { TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_CATEGORIA_PRODUTO, rotulo } from "@/lib/dominio/rotulos";
import { cn } from "@/lib/utils";

interface LinhaEstoque {
  id: string;
  nome: string;
  codigo: string | null;
  categoria: string;
  unidade: string;
  tipo_controle: "unidade" | "metro";
  estoque_atual: number;
  estoque_minimo: number;
  custo_centavos: number;
}

const qtd = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });

const colunas: ColumnDef<LinhaEstoque, unknown>[] = [
  {
    accessorKey: "nome",
    header: "Produto",
    cell: ({ row }) => (
      <Link href={`/estoque/${row.original.id}`} className="font-medium hover:underline">
        {row.original.nome}
        <span className="block text-xs font-normal text-muted-foreground">{[row.original.codigo, row.original.tipo_controle === "metro" ? "controle por metro (rolos)" : null].filter(Boolean).join(" · ")}</span>
      </Link>
    ),
  },
  { accessorKey: "categoria", header: "Categoria", cell: ({ getValue }) => rotulo(ROTULO_CATEGORIA_PRODUTO, getValue() as string), meta: { className: "hidden md:table-cell" } },
  {
    accessorKey: "estoque_atual",
    header: "Saldo",
    cell: ({ row }) => {
      const p = row.original;
      const baixo = p.estoque_minimo > 0 && p.estoque_atual <= p.estoque_minimo;
      return (
        <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", baixo && "font-semibold text-destructive", p.estoque_atual < 0 && "font-bold")}>
          {baixo && <AlertTriangleIcon className="size-3.5" />}
          {qtd(p.estoque_atual)} {p.unidade}
        </span>
      );
    },
    meta: { className: "text-right" },
  },
  { accessorKey: "estoque_minimo", header: "Mínimo", cell: ({ row }) => `${qtd(row.original.estoque_minimo)} ${row.original.unidade}`, meta: { className: "text-right hidden sm:table-cell" } },
  { id: "valor", header: "Valor em estoque", accessorFn: (p) => Math.max(0, p.estoque_atual) * p.custo_centavos, cell: ({ getValue }) => formatarMoeda(Math.round(getValue() as number)), meta: { className: "text-right hidden lg:table-cell" } },
];

export function TabelaEstoque({ produtos, valorEstoque }: { produtos: LinhaEstoque[]; valorEstoque: number }) {
  return (
    <TabelaDados
      colunas={colunas}
      dados={produtos}
      linkLinha={(p) => `/estoque/${p.id}`}
      porPagina={50}
      rodape={
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="hidden md:table-cell" />
            <TableCell colSpan={2} className="text-right">
              Valor total em estoque (custo)
            </TableCell>
            <TableCell className="text-right">{formatarMoeda(Math.round(valorEstoque))}</TableCell>
          </TableRow>
        </TableFooter>
      }
    />
  );
}
