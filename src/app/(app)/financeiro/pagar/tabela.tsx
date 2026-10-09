"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { BanknoteIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Confirmar } from "@/components/comum/confirmar";
import { StatusTitulo } from "@/components/comum/status";
import { TabelaDados } from "@/components/comum/tabela-dados";
import { Campo } from "@/components/formulario/campo";
import { aplicarMascara } from "@/components/formulario/mascaras";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { formatarData, hojeISO } from "@/lib/dominio/datas";
import { centavosParaTexto, formatarMoeda } from "@/lib/dominio/dinheiro";
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/dominio/rotulos";
import type { LinhaPagar } from "@/lib/consultas/financeiro";
import type { FormaPagamento } from "@/lib/supabase/tipos";
import { excluirContaPagar, pagarConta, salvarContaPagar } from "../actions";

type Categoria = { id: string; nome: string };

function DialogoConta({ conta, categorias, fechar }: { conta: LinhaPagar | null; categorias: Categoria[]; fechar: () => void }) {
  const [d, setD] = useState({
    descricao: conta?.descricao ?? "",
    fornecedor: conta?.fornecedor ?? "",
    categoria_id: conta?.categoria_id ?? "",
    documento: conta?.documento ?? "",
    valor: conta ? centavosParaTexto(conta.valor_centavos) : "",
    vencimento: conta?.vencimento ?? hojeISO(),
    parcelas: "1",
  });
  const { pendente, executar } = useAcao();
  return (
    <Dialog open onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{conta ? "Editar conta" : "Nova conta a pagar"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Descrição" nome="desc-pagar" className="sm:col-span-2">
            <Input value={d.descricao} onChange={(e) => setD({ ...d, descricao: e.target.value })} />
          </Campo>
          <Campo rotulo="Fornecedor" nome="fornecedor-pagar">
            <Input value={d.fornecedor} onChange={(e) => setD({ ...d, fornecedor: e.target.value })} />
          </Campo>
          <Campo rotulo="Categoria" nome="categoria-pagar">
            <NativeSelect value={d.categoria_id} onChange={(e) => setD({ ...d, categoria_id: e.target.value })}>
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </NativeSelect>
          </Campo>
          <Campo rotulo="Valor total (R$)" nome="valor-pagar">
            <Input inputMode="decimal" value={d.valor} onChange={(e) => setD({ ...d, valor: aplicarMascara("dinheiro", e.target.value) })} />
          </Campo>
          <Campo rotulo={conta ? "Vencimento" : "1º vencimento"} nome="venc-pagar">
            <Input type="date" value={d.vencimento} onChange={(e) => setD({ ...d, vencimento: e.target.value })} />
          </Campo>
          <Campo rotulo="Documento (nº NF, boleto)" nome="doc-pagar">
            <Input value={d.documento} onChange={(e) => setD({ ...d, documento: e.target.value })} />
          </Campo>
          {!conta && (
            <Campo rotulo="Parcelas mensais" nome="parcelas-pagar">
              <NativeSelect value={d.parcelas} onChange={(e) => setD({ ...d, parcelas: e.target.value })}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </NativeSelect>
            </Campo>
          )}
        </div>
        <DialogFooter>
          <Button disabled={pendente} onClick={() => executar(() => salvarContaPagar({ ...d, id: conta?.id }), { aoConcluir: fechar })}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoPagar({ conta, fechar }: { conta: LinhaPagar; fechar: () => void }) {
  const [valor, setValor] = useState(centavosParaTexto(conta.valor_centavos));
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [data, setData] = useState(hojeISO());
  const { pendente, executar } = useAcao();
  return (
    <Dialog open onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>{conta.descricao}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo rotulo="Valor pago (R$)" nome="valor-pago">
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(aplicarMascara("dinheiro", e.target.value))} />
          </Campo>
          <Campo rotulo="Data" nome="data-pago">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <Campo rotulo="Forma" nome="forma-pago">
            <NativeSelect value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {Object.entries(ROTULO_FORMA_PAGAMENTO).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </NativeSelect>
          </Campo>
        </div>
        <p className="text-xs text-muted-foreground">Pagamentos em dinheiro saem do caixa aberto.</p>
        <DialogFooter>
          <Button disabled={pendente} onClick={() => executar(() => pagarConta({ id: conta.id, valor, forma, data }), { aoConcluir: fechar })}>
            <BanknoteIcon /> Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BotaoNovaConta({ categorias }: { categorias: Categoria[] }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <PlusIcon /> Nova conta
      </Button>
      {aberto && <DialogoConta conta={null} categorias={categorias} fechar={() => setAberto(false)} />}
    </>
  );
}

export function TabelaPagar({ contas, categorias }: { contas: LinhaPagar[]; categorias: Categoria[] }) {
  const [editando, setEditando] = useState<LinhaPagar | null>(null);
  const [pagando, setPagando] = useState<LinhaPagar | null>(null);
  const exclusao = useAcao();
  const colunas: ColumnDef<LinhaPagar, unknown>[] = [
    {
      accessorKey: "descricao",
      header: "Descrição",
      cell: ({ row }) => (
        <span>
          <span className="font-medium">{row.original.descricao}</span>
          <span className="block text-xs text-muted-foreground">{[row.original.fornecedor, row.original.categoria].filter(Boolean).join(" · ")}</span>
        </span>
      ),
    },
    { accessorKey: "vencimento", header: "Vencimento", cell: ({ row }) => <span className={row.original.vencido ? "font-medium text-destructive" : ""}>{formatarData(row.original.vencimento)}</span> },
    { accessorKey: "valor_centavos", header: "Valor", cell: ({ getValue }) => formatarMoeda(getValue() as number), meta: { className: "text-right" } },
    { accessorKey: "status", header: "Situação", cell: ({ row }) => <StatusTitulo status={row.original.status} vencido={row.original.vencido} /> },
    {
      id: "acoes",
      header: "",
      cell: ({ row }) =>
        row.original.status === "aberto" ? (
          <span className="flex justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => setPagando(row.original)}>
              <BanknoteIcon /> Pagar
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setEditando(row.original)} aria-label="Editar">
              <PencilIcon />
            </Button>
            <Confirmar titulo="Excluir esta conta?" destrutivo textoConfirmar="Excluir" aoConfirmar={() => exclusao.executar(() => excluirContaPagar(row.original.id))}>
              <Button size="icon-sm" variant="ghost" aria-label="Excluir">
                <Trash2Icon />
              </Button>
            </Confirmar>
          </span>
        ) : null,
    },
  ];
  return (
    <>
      <TabelaDados colunas={colunas} dados={contas} vazio="Nenhuma conta." porPagina={50} />
      {editando && <DialogoConta conta={editando} categorias={categorias} fechar={() => setEditando(null)} />}
      {pagando && <DialogoPagar conta={pagando} fechar={() => setPagando(null)} />}
    </>
  );
}
