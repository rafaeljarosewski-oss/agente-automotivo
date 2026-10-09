"use client";

import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { HandCoinsIcon, PlusIcon, XIcon } from "lucide-react";

import { Confirmar } from "@/components/comum/confirmar";
import { StatusTitulo } from "@/components/comum/status";
import { TabelaDados } from "@/components/comum/tabela-dados";
import { Campo } from "@/components/formulario/campo";
import { aplicarMascara } from "@/components/formulario/mascaras";
import { useAcao } from "@/components/formulario/usar-acao";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { formatarData, hojeISO } from "@/lib/dominio/datas";
import { centavosParaTexto, formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/dominio/rotulos";
import type { LinhaReceber } from "@/lib/consultas/financeiro";
import type { FormaPagamento } from "@/lib/supabase/tipos";
import { cancelarTituloReceber, novoTituloReceber, receberTitulo } from "../actions";

function DialogoReceber({ titulo, caixaAberto, fechar }: { titulo: LinhaReceber; caixaAberto: boolean; fechar: () => void }) {
  const [valor, setValor] = useState(centavosParaTexto(titulo.valor_centavos));
  const [forma, setForma] = useState<FormaPagamento>(titulo.forma_pagamento ?? "pix");
  const [data, setData] = useState(hojeISO());
  const { pendente, erro, executar } = useAcao();
  return (
    <Dialog open onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receber título</DialogTitle>
          <DialogDescription>{titulo.descricao}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Valor recebido (R$)" nome="valor-recebido">
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(aplicarMascara("dinheiro", e.target.value))} />
          </Campo>
          <Campo rotulo="Data" nome="data-recebimento">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <Campo rotulo="Forma de pagamento" nome="forma-recebimento" className="sm:col-span-2">
            <NativeSelect value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {Object.entries(ROTULO_FORMA_PAGAMENTO).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </NativeSelect>
          </Campo>
        </div>
        {!caixaAberto && (
          <Alert variant={forma === "dinheiro" ? "destructive" : "info"}>
            <AlertDescription>
              {forma === "dinheiro" ? "Abra o caixa do dia para receber em dinheiro." : "Nenhum caixa aberto: o recebimento não entrará na conferência do caixa."}
            </AlertDescription>
          </Alert>
        )}
        {erro && (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="success" disabled={pendente} onClick={() => executar(() => receberTitulo({ id: titulo.id, valor, forma, data }), { aoConcluir: fechar })}>
            <HandCoinsIcon /> Confirmar recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NovoTituloReceber() {
  const [aberto, setAberto] = useState(false);
  const [d, setD] = useState({ descricao: "", valor: "", vencimento: hojeISO() });
  const { pendente, executar } = useAcao();
  return (
    <>
      <Button variant="outline" onClick={() => setAberto(true)}>
        <PlusIcon /> Lançamento avulso
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conta a receber</DialogTitle>
            <DialogDescription>Para receitas fora das OS (ex.: venda de balcão sem OS).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Campo rotulo="Descrição" nome="desc-receber">
              <Input value={d.descricao} onChange={(e) => setD({ ...d, descricao: e.target.value })} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Valor (R$)" nome="valor-receber">
                <Input inputMode="decimal" value={d.valor} onChange={(e) => setD({ ...d, valor: aplicarMascara("dinheiro", e.target.value) })} />
              </Campo>
              <Campo rotulo="Vencimento" nome="venc-receber">
                <Input type="date" value={d.vencimento} onChange={(e) => setD({ ...d, vencimento: e.target.value })} />
              </Campo>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={pendente} onClick={() => executar(() => novoTituloReceber(d), { aoConcluir: () => setAberto(false) })}>
              Lançar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TabelaReceber({ titulos, caixaAberto, podeCancelar }: { titulos: LinhaReceber[]; caixaAberto: boolean; podeCancelar: boolean }) {
  const [recebendo, setRecebendo] = useState<LinhaReceber | null>(null);
  const cancelamento = useAcao();
  const colunas: ColumnDef<LinhaReceber, unknown>[] = [
    {
      accessorKey: "descricao",
      header: "Descrição",
      cell: ({ row }) => (
        <span>
          {row.original.os_id ? (
            <Link href={`/os/${row.original.os_id}`} className="font-medium hover:underline">
              {row.original.descricao}
            </Link>
          ) : (
            <span className="font-medium">{row.original.descricao}</span>
          )}
          {row.original.forma_pagamento && <span className="block text-xs text-muted-foreground">{ROTULO_FORMA_PAGAMENTO[row.original.forma_pagamento]}</span>}
        </span>
      ),
    },
    { accessorKey: "vencimento", header: "Vencimento", cell: ({ row }) => <span className={row.original.vencido ? "font-medium text-destructive" : ""}>{formatarData(row.original.vencimento)}</span> },
    { accessorKey: "valor_centavos", header: "Valor", cell: ({ getValue }) => formatarMoeda(getValue() as number), meta: { className: "text-right" } },
    {
      accessorKey: "status",
      header: "Situação",
      cell: ({ row }) => (
        <span>
          <StatusTitulo status={row.original.status} vencido={row.original.vencido} />
          {row.original.pago_em && <span className="block text-xs text-muted-foreground">{formatarData(row.original.pago_em)}</span>}
        </span>
      ),
    },
    {
      id: "acoes",
      header: "",
      cell: ({ row }) =>
        row.original.status === "aberto" ? (
          <span className="flex justify-end gap-1">
            <Button size="sm" variant="success" onClick={() => setRecebendo(row.original)}>
              <HandCoinsIcon /> Receber
            </Button>
            {podeCancelar && (
              <Confirmar titulo="Cancelar este título?" destrutivo textoConfirmar="Cancelar título" aoConfirmar={() => cancelamento.executar(() => cancelarTituloReceber(row.original.id))}>
                <Button size="icon-sm" variant="ghost" aria-label="Cancelar título">
                  <XIcon />
                </Button>
              </Confirmar>
            )}
          </span>
        ) : null,
    },
  ];
  return (
    <>
      <TabelaDados colunas={colunas} dados={titulos} vazio="Nenhum título." porPagina={50} />
      {recebendo && <DialogoReceber titulo={recebendo} caixaAberto={caixaAberto} fechar={() => setRecebendo(null)} />}
    </>
  );
}
