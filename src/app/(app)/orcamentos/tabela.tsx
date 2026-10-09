"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { StatusOrcamento } from "@/components/comum/status";
import { TabelaDados } from "@/components/comum/tabela-dados";
import { formatarData } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { formatarPlaca } from "@/lib/dominio/placa";
import type { LinhaOrcamento } from "@/lib/consultas/orcamentos";

const colunas: ColumnDef<LinhaOrcamento, unknown>[] = [
  {
    accessorKey: "numero",
    header: "Nº",
    cell: ({ row }) => (
      <Link href={`/orcamentos/${row.original.id}`} className="font-medium hover:underline">
        {row.original.numero}
      </Link>
    ),
  },
  { accessorKey: "created_at", header: "Data", cell: ({ getValue }) => formatarData(getValue() as string), meta: { className: "hidden sm:table-cell" } },
  { accessorKey: "cliente", header: "Cliente", cell: ({ row }) => <span className="font-medium">{row.original.cliente}</span> },
  {
    accessorKey: "veiculo",
    header: "Veículo",
    cell: ({ row }) =>
      row.original.placa ? (
        <span className="text-sm">
          <span className="font-mono text-xs">{formatarPlaca(row.original.placa)}</span> {row.original.veiculo}
        </span>
      ) : (
        "—"
      ),
    meta: { className: "hidden md:table-cell" },
  },
  { accessorKey: "validade", header: "Validade", cell: ({ getValue }) => formatarData(getValue() as string), meta: { className: "hidden lg:table-cell" } },
  { accessorKey: "total_centavos", header: "Total", cell: ({ getValue }) => formatarMoeda(getValue() as number), meta: { className: "text-right" } },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusOrcamento status={row.original.status} /> },
];

export function TabelaOrcamentos({ orcamentos }: { orcamentos: LinhaOrcamento[] }) {
  return <TabelaDados colunas={colunas} dados={orcamentos} linkLinha={(o) => `/orcamentos/${o.id}`} vazio="Nenhum orçamento encontrado." />;
}
