"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Props<T> {
  colunas: ColumnDef<T, unknown>[];
  dados: T[];
  linkLinha?: (linha: T) => string;
  vazio?: string;
  porPagina?: number;
  rodape?: React.ReactNode;
}

/** Listagem com ordenação e paginação (TanStack Table). Os filtros são aplicados no servidor. */
export function TabelaDados<T>({ colunas, dados, linkLinha, vazio = "Nenhum registro encontrado.", porPagina = 25, rodape }: Props<T>) {
  const router = useRouter();
  const [ordenacao, setOrdenacao] = useState<SortingState>([]);
  // eslint-disable-next-line react-hooks/incompatible-library
  const tabela = useReactTable({
    data: dados,
    columns: colunas,
    state: { sorting: ordenacao },
    onSortingChange: setOrdenacao,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: porPagina } },
  });

  const linhas = tabela.getRowModel().rows;

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          {tabela.getHeaderGroups().map((grupo) => (
            <TableRow key={grupo.id} className="hover:bg-transparent">
              {grupo.headers.map((cab) => {
                const ordenavel = cab.column.getCanSort();
                const dir = cab.column.getIsSorted();
                return (
                  <TableHead key={cab.id} className={cn((cab.column.columnDef.meta as { className?: string })?.className)}>
                    {cab.isPlaceholder ? null : ordenavel ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-primary"
                        onClick={cab.column.getToggleSortingHandler()}
                      >
                        {flexRender(cab.column.columnDef.header, cab.getContext())}
                        {dir === "asc" ? (
                          <ArrowUpIcon className="size-3" />
                        ) : dir === "desc" ? (
                          <ArrowDownIcon className="size-3" />
                        ) : (
                          <ArrowUpDownIcon className="size-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(cab.column.columnDef.header, cab.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {linhas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colunas.length} className="h-24 text-center text-muted-foreground">
                {vazio}
              </TableCell>
            </TableRow>
          ) : (
            linhas.map((linha) => (
              <TableRow
                key={linha.id}
                className={cn(linkLinha && "cursor-pointer")}
                onClick={(e) => {
                  if (!linkLinha) return;
                  const alvo = e.target as HTMLElement;
                  if (alvo.closest("a,button,input,label,[role=checkbox]")) return;
                  router.push(linkLinha(linha.original));
                }}
              >
                {linha.getVisibleCells().map((celula) => (
                  <TableCell key={celula.id} className={cn((celula.column.columnDef.meta as { className?: string })?.className)}>
                    {flexRender(celula.column.columnDef.cell, celula.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
        {rodape}
      </Table>
      {tabela.getPageCount() > 1 && (
        <div className="flex items-center justify-between border-t px-3 py-2 text-sm text-muted-foreground">
          <span>
            {dados.length} registro(s) · página {tabela.getState().pagination.pageIndex + 1} de {tabela.getPageCount()}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => tabela.previousPage()} disabled={!tabela.getCanPreviousPage()} aria-label="Página anterior">
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => tabela.nextPage()} disabled={!tabela.getCanNextPage()} aria-label="Próxima página">
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
