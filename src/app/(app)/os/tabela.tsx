"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClockIcon, CarIcon } from "lucide-react";

import { EstadoVazio } from "@/components/comum/estado-vazio";
import { StatusOS } from "@/components/comum/status";
import { TabelaDados } from "@/components/comum/tabela-dados";
import { Card, CardContent } from "@/components/ui/card";
import { formatarData, formatarDataHora } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { formatarPlaca } from "@/lib/dominio/placa";
import type { LinhaOS } from "@/lib/consultas/os";

const colunas: ColumnDef<LinhaOS, unknown>[] = [
  {
    accessorKey: "numero",
    header: "Nº",
    cell: ({ row }) => (
      <Link href={`/os/${row.original.id}`} className="font-medium hover:underline">
        {row.original.numero}
      </Link>
    ),
  },
  { accessorKey: "created_at", header: "Abertura", cell: ({ getValue }) => formatarData(getValue() as string), meta: { className: "hidden sm:table-cell" } },
  { accessorKey: "cliente", header: "Cliente", cell: ({ row }) => <span className="font-medium">{row.original.cliente}</span> },
  {
    accessorKey: "placa",
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
  { accessorKey: "instalador", header: "Instalador", cell: ({ getValue }) => (getValue() as string | null) ?? "—", meta: { className: "hidden lg:table-cell" } },
  { accessorKey: "total_centavos", header: "Total", cell: ({ getValue }) => formatarMoeda(getValue() as number), meta: { className: "text-right" } },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusOS status={row.original.status} /> },
];

export function TabelaOS({ ordens }: { ordens: LinhaOS[] }) {
  return <TabelaDados colunas={colunas} dados={ordens} linkLinha={(o) => `/os/${o.id}`} vazio="Nenhuma OS encontrada." />;
}

/** Visão em cartões, pensada para o instalador usar no celular */
export function CartoesOS({ ordens }: { ordens: LinhaOS[] }) {
  if (ordens.length === 0) return <EstadoVazio titulo="Nenhuma OS por aqui" descricao="Quando uma OS for atribuída a você, ela aparece nesta lista." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ordens.map((o) => (
        <Link key={o.id} href={`/os/${o.id}`}>
          <Card className="gap-2 py-4 transition-colors hover:border-primary">
            <CardContent className="grid gap-2 px-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">OS nº {o.numero}</span>
                <StatusOS status={o.status} />
              </div>
              <div className="font-medium">{o.cliente}</div>
              {o.placa && (
                <div className="flex items-center gap-2 text-sm">
                  <CarIcon className="size-4 text-muted-foreground" />
                  <span className="font-mono">{formatarPlaca(o.placa)}</span> {o.veiculo}
                </div>
              )}
              {o.previsao_entrega && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClockIcon className="size-4" /> Entrega: {formatarDataHora(o.previsao_entrega)}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
