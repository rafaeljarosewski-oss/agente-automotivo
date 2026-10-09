"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { StatusNota } from "@/components/comum/status";
import { TabelaDados } from "@/components/comum/tabela-dados";
import { Badge } from "@/components/ui/badge";
import { formatarDataHora } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_TIPO_NOTA } from "@/lib/dominio/rotulos";
import type { LinhaNota } from "@/lib/consultas/notas";

const colunas: ColumnDef<LinhaNota, unknown>[] = [
  {
    accessorKey: "tipo",
    header: "Nota",
    cell: ({ row }) => (
      <Link href={`/notas/${row.original.id}`} className="font-medium hover:underline">
        {ROTULO_TIPO_NOTA[row.original.tipo]} {row.original.numero ? `nº ${row.original.numero}` : ""}
        {row.original.ambiente === "homologacao" && (
          <Badge variant="muted" className="ml-2">
            homologação
          </Badge>
        )}
      </Link>
    ),
  },
  { accessorKey: "created_at", header: "Data", cell: ({ getValue }) => formatarDataHora(getValue() as string), meta: { className: "hidden sm:table-cell" } },
  { accessorKey: "cliente", header: "Cliente", cell: ({ row }) => row.original.cliente ?? "Consumidor" },
  { accessorKey: "os_numero", header: "OS", cell: ({ getValue }) => (getValue() ? `nº ${getValue()}` : "—"), meta: { className: "hidden md:table-cell" } },
  { accessorKey: "valor_total_centavos", header: "Valor", cell: ({ getValue }) => formatarMoeda(getValue() as number), meta: { className: "text-right" } },
  {
    accessorKey: "status",
    header: "Situação",
    cell: ({ row }) => (
      <span title={row.original.motivo_amigavel ?? undefined}>
        <StatusNota status={row.original.status} />
      </span>
    ),
  },
];

export function TabelaNotas({ notas }: { notas: LinhaNota[] }) {
  return <TabelaDados colunas={colunas} dados={notas} linkLinha={(n) => `/notas/${n.id}`} vazio="Nenhuma nota encontrada." />;
}
