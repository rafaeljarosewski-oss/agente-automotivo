"use client";

import { useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Confirmar } from "@/components/comum/confirmar";
import { Campo } from "@/components/formulario/campo";
import { aplicarMascara } from "@/components/formulario/mascaras";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { centavosParaTexto } from "@/lib/dominio/dinheiro";
import type { Tabela } from "@/lib/supabase/tipos";
import { excluirLinhaPelicula, salvarCelulaTabela, salvarLinhaPelicula } from "./actions";

type Linha = Tabela<"linhas_pelicula">;
type Celula = Tabela<"tabela_precos_pelicula">;

function CelulaPreco({ linhaId, categoriaId, celula, podeEditar }: { linhaId: string; categoriaId: string; celula?: Celula; podeEditar: boolean }) {
  const [preco, setPreco] = useState(celula ? centavosParaTexto(celula.preco_centavos) : "");
  const [consumo, setConsumo] = useState(celula ? String(celula.consumo_metros).replace(".", ",") : "");
  const [salvo, setSalvo] = useState({ preco, consumo });
  const { pendente, executar } = useAcao();

  function salvar() {
    if (!podeEditar || (preco === salvo.preco && consumo === salvo.consumo) || !preco) return;
    executar(() => salvarCelulaTabela({ linha_id: linhaId, categoria_id: categoriaId, preco_centavos: preco, consumo_metros: consumo || "0" }), {
      silencioso: true,
      aoConcluir: () => {
        setSalvo({ preco, consumo });
        toast.success("Preço salvo.", { duration: 1200 });
      },
    });
  }

  if (!podeEditar) {
    return (
      <div className="text-right text-sm">
        <div className="font-medium">{celula ? `R$ ${preco}` : "—"}</div>
        {celula && <div className="text-xs text-muted-foreground">{consumo} m</div>}
      </div>
    );
  }
  return (
    <div className="grid gap-1" aria-busy={pendente}>
      <div className="relative">
        <span className="absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
        <Input
          className="h-8 pl-7 text-right"
          inputMode="decimal"
          value={preco}
          onChange={(e) => setPreco(aplicarMascara("dinheiro", e.target.value))}
          onBlur={salvar}
          aria-label="Preço"
        />
      </div>
      <div className="relative">
        <Input
          className="h-8 pr-6 text-right text-xs"
          inputMode="decimal"
          value={consumo}
          onChange={(e) => setConsumo(aplicarMascara("decimal", e.target.value))}
          onBlur={salvar}
          aria-label="Consumo em metros"
        />
        <span className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">m</span>
      </div>
    </div>
  );
}

function DialogoLinha({
  linha,
  rolos,
  servicos,
  fechar,
}: {
  linha: Partial<Linha> | null;
  rolos: { id: string; nome: string }[];
  servicos: { id: string; nome: string }[];
  fechar: () => void;
}) {
  const [dados, setDados] = useState({
    nome: linha?.nome ?? "",
    marca: linha?.marca ?? "",
    descricao: linha?.descricao ?? "",
    produto_id: linha?.produto_id ?? "",
    servico_id: linha?.servico_id ?? servicos[0]?.id ?? "",
    ordem: linha?.ordem ?? 0,
  });
  const { pendente, executar } = useAcao();
  return (
    <Dialog open onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{linha?.id ? "Editar linha de película" : "Nova linha de película"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            executar(() => salvarLinhaPelicula({ ...dados, id: linha?.id }), { aoConcluir: fechar });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Nome da linha" nome="nome-linha" obrigatorio>
              <Input value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} placeholder="Ex.: G20, Nano cerâmica" />
            </Campo>
            <Campo rotulo="Marca" nome="marca-linha">
              <Input value={dados.marca} onChange={(e) => setDados({ ...dados, marca: e.target.value })} />
            </Campo>
          </div>
          <Campo rotulo="Descrição (aparece no orçamento)" nome="descricao-linha">
            <Input value={dados.descricao} onChange={(e) => setDados({ ...dados, descricao: e.target.value })} />
          </Campo>
          <Campo rotulo="Rolo consumido (estoque)" nome="produto-linha" ajuda="Produto controlado por metro que terá baixa na conclusão da OS.">
            <NativeSelect value={dados.produto_id} onChange={(e) => setDados({ ...dados, produto_id: e.target.value })}>
              <option value="">Sem baixa de estoque</option>
              {rolos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </NativeSelect>
          </Campo>
          <Campo rotulo="Serviço (dados fiscais e comissão)" nome="servico-linha">
            <NativeSelect value={dados.servico_id} onChange={(e) => setDados({ ...dados, servico_id: e.target.value })}>
              <option value="">—</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </NativeSelect>
          </Campo>
          <DialogFooter>
            <Button type="submit" disabled={pendente || !dados.nome.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TabelaPeliculas({
  linhas,
  categorias,
  tabela,
  rolos,
  servicos,
  podeEditar,
}: {
  linhas: Linha[];
  categorias: { id: string; nome: string }[];
  tabela: Celula[];
  rolos: { id: string; nome: string }[];
  servicos: { id: string; nome: string }[];
  podeEditar: boolean;
}) {
  const [editando, setEditando] = useState<Partial<Linha> | null>(null);
  const { executar } = useAcao();
  const celula = (l: string, c: string) => tabela.find((t) => t.linha_id === l && t.categoria_id === c);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Preço do serviço completo para cada categoria de veículo e o <strong>consumo padrão em metros</strong> do rolo — usado para dar baixa
        no estoque quando a OS é concluída.
      </p>
      {podeEditar && (
        <div>
          <Button variant="outline" onClick={() => setEditando({})}>
            <PlusIcon /> Nova linha
          </Button>
        </div>
      )}
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-medium">Linha</th>
                {categorias.map((c) => (
                  <th key={c.id} className="px-2 py-2 text-right font-medium">
                    {c.nome}
                  </th>
                ))}
                {podeEditar && <th className="w-20" />}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium">{l.nome}</div>
                    <div className="text-xs text-muted-foreground">{l.marca}</div>
                    {!l.produto_id && <div className="text-xs text-warning-foreground">sem rolo vinculado</div>}
                  </td>
                  {categorias.map((c) => (
                    <td key={c.id} className="px-2 py-2 align-top">
                      <CelulaPreco linhaId={l.id} categoriaId={c.id} celula={celula(l.id, c.id)} podeEditar={podeEditar} />
                    </td>
                  ))}
                  {podeEditar && (
                    <td className="px-2 py-2 align-top">
                      <div className="flex">
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditando(l)} aria-label={`Editar ${l.nome}`}>
                          <PencilIcon />
                        </Button>
                        <Confirmar titulo={`Excluir a linha ${l.nome}?`} destrutivo textoConfirmar="Excluir" aoConfirmar={() => executar(() => excluirLinhaPelicula(l.id))}>
                          <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${l.nome}`}>
                            <Trash2Icon />
                          </Button>
                        </Confirmar>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={categorias.length + 2} className="p-6 text-center text-muted-foreground">
                    Nenhuma linha de película cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {editando && <DialogoLinha linha={editando} rolos={rolos} servicos={servicos} fechar={() => setEditando(null)} />}
    </div>
  );
}
