"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";

import { TabelaDados } from "@/components/comum/tabela-dados";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_CATEGORIA_PRODUTO, ROTULO_CATEGORIA_SERVICO, ROTULO_TIPO_PRECO, rotulo } from "@/lib/dominio/rotulos";
import type { Tabela } from "@/lib/supabase/tipos";
import { cn } from "@/lib/utils";

function SeloFiscal({ validado }: { validado: boolean }) {
  return validado ? (
    <CheckCircle2Icon className="size-4 text-success" aria-label="Dados fiscais validados" />
  ) : (
    <AlertTriangleIcon className="size-4 text-warning-foreground" aria-label="Dados fiscais não validados" />
  );
}

const colunasProdutos: ColumnDef<Tabela<"produtos">, unknown>[] = [
  {
    accessorKey: "nome",
    header: "Produto",
    cell: ({ row }) => (
      <Link href={`/catalogo/produtos/${row.original.id}`} className="font-medium hover:underline">
        {row.original.nome}
        {!row.original.ativo && (
          <Badge variant="muted" className="ml-2">
            Inativo
          </Badge>
        )}
        <span className="block text-xs font-normal text-muted-foreground">{[row.original.codigo, row.original.marca].filter(Boolean).join(" · ")}</span>
      </Link>
    ),
  },
  { accessorKey: "categoria", header: "Categoria", cell: ({ getValue }) => rotulo(ROTULO_CATEGORIA_PRODUTO, getValue() as string), meta: { className: "hidden md:table-cell" } },
  { accessorKey: "preco_venda_centavos", header: "Preço", cell: ({ getValue }) => formatarMoeda(getValue() as number), meta: { className: "text-right" } },
  {
    accessorKey: "estoque_atual",
    header: "Estoque",
    cell: ({ row }) => {
      const p = row.original;
      const baixo = p.estoque_minimo > 0 && p.estoque_atual <= p.estoque_minimo;
      return (
        <span className={cn("whitespace-nowrap", baixo && "font-semibold text-destructive")}>
          {Number(p.estoque_atual).toLocaleString("pt-BR")} {p.unidade}
        </span>
      );
    },
    meta: { className: "text-right" },
  },
  { accessorKey: "ncm", header: "NCM", meta: { className: "hidden lg:table-cell font-mono text-xs" } },
  { accessorKey: "fiscal_validado", header: "Fiscal", cell: ({ getValue }) => <SeloFiscal validado={getValue() as boolean} /> },
];

const colunasServicos: ColumnDef<Tabela<"servicos">, unknown>[] = [
  {
    accessorKey: "nome",
    header: "Serviço",
    cell: ({ row }) => (
      <Link href={`/catalogo/servicos/${row.original.id}`} className="font-medium hover:underline">
        {row.original.nome}
        {!row.original.ativo && (
          <Badge variant="muted" className="ml-2">
            Inativo
          </Badge>
        )}
        <span className="block text-xs font-normal text-muted-foreground">{row.original.codigo}</span>
      </Link>
    ),
  },
  { accessorKey: "categoria", header: "Categoria", cell: ({ getValue }) => rotulo(ROTULO_CATEGORIA_SERVICO, getValue() as string), meta: { className: "hidden md:table-cell" } },
  { accessorKey: "tipo_preco", header: "Preço", cell: ({ row }) => (row.original.tipo_preco === "fixo" ? formatarMoeda(row.original.preco_centavos) : row.original.tipo_preco === "m2" ? `${formatarMoeda(row.original.preco_centavos)}/m²` : rotulo(ROTULO_TIPO_PRECO, row.original.tipo_preco)) },
  {
    id: "comissao",
    header: "Comissão",
    accessorFn: (s) => s.comissao_tipo,
    cell: ({ row }) =>
      row.original.comissao_tipo === "percentual"
        ? `${Number(row.original.comissao_percentual).toLocaleString("pt-BR")}%`
        : row.original.comissao_tipo === "fixo"
          ? formatarMoeda(row.original.comissao_fixo_centavos)
          : "—",
    meta: { className: "hidden md:table-cell" },
  },
  { accessorKey: "codigo_servico", header: "Cód. serviço", meta: { className: "hidden lg:table-cell font-mono text-xs" } },
  { accessorKey: "fiscal_validado", header: "Fiscal", cell: ({ getValue }) => <SeloFiscal validado={getValue() as boolean} /> },
];

export function TabelaProdutos({ produtos }: { produtos: Tabela<"produtos">[] }) {
  return <TabelaDados colunas={colunasProdutos} dados={produtos} linkLinha={(p) => `/catalogo/produtos/${p.id}`} vazio="Nenhum produto." />;
}

export function TabelaServicos({ servicos }: { servicos: Tabela<"servicos">[] }) {
  return <TabelaDados colunas={colunasServicos} dados={servicos} linkLinha={(s) => `/catalogo/servicos/${s.id}`} vazio="Nenhum serviço." />;
}
