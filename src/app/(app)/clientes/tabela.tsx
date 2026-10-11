"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { MessageCircleIcon } from "lucide-react";

import { TabelaDados } from "@/components/comum/tabela-dados";
import { Badge } from "@/components/ui/badge";
import { formatarTelefone, numeroWhatsApp } from "@/lib/dominio/contato";
import { formatarCpfCnpj } from "@/lib/dominio/documentos";
import { formatarPlaca } from "@/lib/dominio/placa";
import type { LinhaCliente } from "@/lib/consultas/clientes";

const colunas: ColumnDef<LinhaCliente, unknown>[] = [
  {
    accessorKey: "nome",
    header: "Nome",
    cell: ({ row }) => (
      <Link href={`/clientes/${row.original.id}`} className="font-medium hover:underline">
        {row.original.nome}
        {row.original.tipo_pessoa === "PJ" && (
          <Badge variant="muted" className="ml-2">
            PJ
          </Badge>
        )}
      </Link>
    ),
  },
  { accessorKey: "cpf_cnpj", header: "CPF/CNPJ", cell: ({ getValue }) => formatarCpfCnpj(getValue() as string | null), meta: { className: "hidden md:table-cell" } },
  {
    id: "contato",
    header: "Contato",
    accessorFn: (c) => c.whatsapp ?? c.telefone,
    cell: ({ row }) => {
      const tel = row.original.whatsapp ?? row.original.telefone;
      const wa = row.original.whatsapp ? numeroWhatsApp(row.original.whatsapp) : null;
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {formatarTelefone(tel)}
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label="Abrir WhatsApp" className="text-success">
              <MessageCircleIcon className="size-4" />
            </a>
          )}
        </span>
      );
    },
  },
  { accessorKey: "cidade", header: "Cidade", meta: { className: "hidden lg:table-cell" } },
  {
    accessorKey: "placas",
    header: "Veículos",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">
        {(getValue() as string | null)
          ?.split(", ")
          .map((p) => formatarPlaca(p))
          .join(", ")}
      </span>
    ),
  },
];

export function TabelaClientes({ clientes }: { clientes: LinhaCliente[] }) {
  return <TabelaDados colunas={colunas} dados={clientes} linkLinha={(c) => `/clientes/${c.id}`} vazio="Nenhum cliente encontrado." />;
}
