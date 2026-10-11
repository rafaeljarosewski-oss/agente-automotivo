"use client";

import { useState } from "react";
import { AlertTriangleIcon, PlusIcon, RulerIcon, Trash2Icon } from "lucide-react";

import { Combobox, type OpcaoCombo } from "@/components/comum/combobox";
import { aplicarMascara } from "@/components/formulario/mascaras";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { areaTotal, consumoPorArea, precoPelicula, precoUnitarioServico } from "@/lib/dominio/calculos";
import { centavosParaTexto, formatarMoeda } from "@/lib/dominio/dinheiro";
import type { CatalogoEditor } from "@/lib/consultas/catalogo";
import { fmtNum, medidasParaNumeros, novaChave, valoresItem, type ItemRascunho, type MedidaRascunho } from "./rascunho";

export * from "./rascunho";

function DialogoMedidas({ item, aoSalvar, fechar }: { item: ItemRascunho; aoSalvar: (medidas: MedidaRascunho[]) => void; fechar: () => void }) {
  const [medidas, setMedidas] = useState<MedidaRascunho[]>(
    item.medidas?.length ? item.medidas : [{ descricao: "", largura_m: "", altura_m: "", quantidade: "1" }],
  );
  const area = areaTotal(medidasParaNumeros(medidas));
  const alterar = (i: number, campo: keyof MedidaRascunho, valor: string) =>
    setMedidas(medidas.map((m, j) => (j === i ? { ...m, [campo]: campo === "descricao" ? valor : aplicarMascara(campo === "quantidade" ? "decimal" : "decimal", valor) } : m)));
  return (
    <Dialog open onOpenChange={(a) => !a && fechar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Medidas dos vidros</DialogTitle>
          <DialogDescription>Informe largura e altura de cada vidro em metros. O sistema calcula a área total.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <div className="hidden grid-cols-[1fr_6rem_6rem_4.5rem_2rem] gap-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Vidro</span>
            <span>Largura (m)</span>
            <span>Altura (m)</span>
            <span>Qtd.</span>
            <span />
          </div>
          {medidas.map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 rounded-md border p-2 sm:grid-cols-[1fr_6rem_6rem_4.5rem_2rem] sm:border-0 sm:p-0">
              <Input className="col-span-4 sm:col-span-1" placeholder="Ex.: Janela da sala" value={m.descricao} onChange={(e) => alterar(i, "descricao", e.target.value)} aria-label="Descrição do vidro" />
              <Input inputMode="decimal" placeholder="1,20" value={m.largura_m} onChange={(e) => alterar(i, "largura_m", e.target.value)} aria-label="Largura em metros" />
              <Input inputMode="decimal" placeholder="1,50" value={m.altura_m} onChange={(e) => alterar(i, "altura_m", e.target.value)} aria-label="Altura em metros" />
              <Input inputMode="numeric" value={m.quantidade} onChange={(e) => alterar(i, "quantidade", e.target.value)} aria-label="Quantidade" />
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setMedidas(medidas.filter((_, j) => j !== i))} aria-label="Remover vidro" disabled={medidas.length === 1}>
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setMedidas([...medidas, { descricao: "", largura_m: "", altura_m: "", quantidade: "1" }])}>
            <PlusIcon /> Adicionar vidro
          </Button>
        </div>
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-sm">
            Área total: <strong>{fmtNum(area, 4)} m²</strong>
          </span>
          <Button type="button" onClick={() => aoSalvar(medidas)} disabled={area <= 0}>
            Usar estas medidas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditorItens({
  catalogo,
  categoriaId,
  itens,
  setItens,
  instaladores,
  mostrarSeries = false,
}: {
  catalogo: CatalogoEditor;
  categoriaId: string | null;
  itens: ItemRascunho[];
  setItens: (itens: ItemRascunho[]) => void;
  instaladores?: { id: string; nome: string }[];
  mostrarSeries?: boolean;
}) {
  const [medindo, setMedindo] = useState<string | null>(null);
  const servicoPelicula = catalogo.servicos.find((s) => s.tipo_preco === "pelicula");

  const opcoes: OpcaoCombo[] = [
    ...catalogo.linhas.map((l) => {
      const t = precoPelicula(catalogo.tabela, l.id, categoriaId);
      return {
        valor: `linha:${l.id}`,
        rotulo: `Película ${l.nome}${l.marca ? ` (${l.marca})` : ""}`,
        detalhe: t ? `${formatarMoeda(t.preco_centavos)} · consumo ${fmtNum(t.consumo_metros)} m` : "Escolha o veículo para ver o preço",
        grupo: "Películas automotivas",
      };
    }),
    ...catalogo.servicos
      .filter((s) => s.tipo_preco !== "pelicula")
      .map((s) => ({
        valor: `servico:${s.id}`,
        rotulo: s.nome,
        detalhe: s.tipo_preco === "m2" ? `${formatarMoeda(s.preco_centavos)} por m²` : formatarMoeda(precoUnitarioServico(s, categoriaId)),
        grupo: "Serviços",
      })),
    ...catalogo.produtos.map((p) => ({
      valor: `produto:${p.id}`,
      rotulo: p.nome,
      detalhe: `${formatarMoeda(p.preco_venda_centavos)} · estoque ${fmtNum(p.estoque_atual)} ${p.unidade}`,
      busca: p.codigo ?? "",
      grupo: "Produtos",
    })),
  ];

  function adicionar(valor: string) {
    const [tipo, id] = valor.split(":") as ["linha" | "servico" | "produto", string];
    let item: ItemRascunho;
    if (tipo === "produto") {
      const p = catalogo.produtos.find((x) => x.id === id)!;
      item = { chave: novaChave(), tipo: "produto", produto_id: p.id, descricao: p.nome, quantidade: "1", unidade: p.unidade, preco: centavosParaTexto(p.preco_venda_centavos), desconto: "", numeros_serie: [] };
    } else if (tipo === "linha") {
      const l = catalogo.linhas.find((x) => x.id === id)!;
      const t = precoPelicula(catalogo.tabela, l.id, categoriaId);
      item = {
        chave: novaChave(),
        tipo: "servico",
        servico_id: l.servico_id ?? servicoPelicula?.id ?? null,
        linha_pelicula_id: l.id,
        descricao: `Aplicação de película ${l.nome}${l.marca ? ` ${l.marca}` : ""}`,
        quantidade: "1",
        unidade: "UN",
        preco: centavosParaTexto(t?.preco_centavos ?? 0),
        desconto: "",
        consumo_metros: t?.consumo_metros ?? null,
      };
    } else {
      const s = catalogo.servicos.find((x) => x.id === id)!;
      item = {
        chave: novaChave(),
        tipo: "servico",
        servico_id: s.id,
        descricao: s.nome,
        quantidade: s.tipo_preco === "m2" ? "" : "1",
        unidade: s.tipo_preco === "m2" ? "M2" : "UN",
        preco: centavosParaTexto(precoUnitarioServico(s, categoriaId)),
        desconto: "",
        medidas: s.tipo_preco === "m2" ? [] : null,
      };
      if (s.tipo_preco === "m2") setMedindo(item.chave);
    }
    setItens([...itens, item]);
  }

  function alterar(chave: string, mudancas: Partial<ItemRascunho>) {
    setItens(itens.map((i) => (i.chave === chave ? { ...i, ...mudancas } : i)));
  }

  function aplicarMedidas(item: ItemRascunho, medidas: MedidaRascunho[]) {
    const s = catalogo.servicos.find((x) => x.id === item.servico_id);
    const area = areaTotal(medidasParaNumeros(medidas));
    const consumo = s?.largura_rolo_m ? consumoPorArea(area, s.largura_rolo_m, s.perda_percentual) : null;
    alterar(item.chave, { medidas, quantidade: fmtNum(area, 4), consumo_metros: consumo });
    setMedindo(null);
  }

  const itemMedindo = itens.find((i) => i.chave === medindo);

  return (
    <div className="grid gap-3">
      {itens.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum item. Use o campo abaixo para adicionar serviços, películas e produtos.</p>}
      {itens.map((item, indice) => {
        const v = valoresItem(item);
        const servico = catalogo.servicos.find((s) => s.id === item.servico_id);
        const produto = catalogo.produtos.find((p) => p.id === item.produto_id);
        const porArea = servico?.tipo_preco === "m2";
        const semPreco = v.preco === 0;
        const estoqueInsuficiente = produto && v.quantidade > produto.estoque_atual;
        return (
          <div key={item.chave} className="grid gap-3 rounded-lg border bg-card p-3" data-testid="item-editor">
            <div className="flex items-start gap-2">
              <Badge variant={item.tipo === "servico" ? "info" : "secondary"} className="mt-2">
                {indice + 1}
              </Badge>
              <Input className="flex-1" value={item.descricao} onChange={(e) => alterar(item.chave, { descricao: e.target.value })} aria-label="Descrição do item" />
              <Button type="button" variant="ghost" size="icon" onClick={() => setItens(itens.filter((i) => i.chave !== item.chave))} aria-label="Remover item">
                <Trash2Icon />
              </Button>
            </div>

            {item.linha_pelicula_id && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Label className="text-xs">Linha:</Label>
                <NativeSelect
                  className="h-8 w-auto"
                  value={item.linha_pelicula_id}
                  onChange={(e) => {
                    const l = catalogo.linhas.find((x) => x.id === e.target.value)!;
                    const t = precoPelicula(catalogo.tabela, l.id, categoriaId);
                    alterar(item.chave, {
                      linha_pelicula_id: l.id,
                      descricao: `Aplicação de película ${l.nome}${l.marca ? ` ${l.marca}` : ""}`,
                      preco: centavosParaTexto(t?.preco_centavos ?? 0),
                      consumo_metros: t?.consumo_metros ?? null,
                      precoManual: false,
                    });
                  }}
                  aria-label="Linha de película"
                >
                  {catalogo.linhas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </NativeSelect>
                {item.consumo_metros ? <span className="text-muted-foreground">consumo previsto: {fmtNum(item.consumo_metros)} m</span> : null}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr]">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">{porArea ? "Área (m²)" : `Quantidade (${item.unidade})`}</Label>
                <div className="flex gap-1">
                  <Input inputMode="decimal" value={item.quantidade} onChange={(e) => alterar(item.chave, { quantidade: aplicarMascara("decimal", e.target.value) })} aria-label="Quantidade" readOnly={porArea && Boolean(item.medidas?.length)} />
                  {porArea && (
                    <Button type="button" variant="outline" size="icon" onClick={() => setMedindo(item.chave)} aria-label="Medidas dos vidros" title="Medidas dos vidros">
                      <RulerIcon />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Preço unit. (R$)</Label>
                <Input inputMode="decimal" value={item.preco} onChange={(e) => alterar(item.chave, { preco: aplicarMascara("dinheiro", e.target.value), precoManual: true })} aria-label="Preço unitário" />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Desconto (R$)</Label>
                <Input inputMode="decimal" value={item.desconto} onChange={(e) => alterar(item.chave, { desconto: aplicarMascara("dinheiro", e.target.value) })} aria-label="Desconto do item" />
              </div>
              <div className="grid gap-1 text-right">
                <Label className="justify-end text-xs text-muted-foreground">Total</Label>
                <span className="py-1.5 font-semibold" data-testid="total-item">
                  {formatarMoeda(v.total)}
                </span>
              </div>
            </div>

            {porArea && item.medidas && item.medidas.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {medidasParaNumeros(item.medidas)
                  .map((m) => `${m.descricao ? `${m.descricao}: ` : ""}${fmtNum(m.largura_m)} × ${fmtNum(m.altura_m)} m${m.quantidade > 1 ? ` (×${m.quantidade})` : ""}`)
                  .join(" · ")}
                {item.consumo_metros ? ` — consumo previsto: ${fmtNum(item.consumo_metros, 2)} m de película` : ""}
              </p>
            )}

            {(instaladores || (mostrarSeries && produto?.exige_numero_serie)) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {instaladores && item.tipo === "servico" && (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Instalador deste item</Label>
                    <NativeSelect value={item.instalador_id ?? ""} onChange={(e) => alterar(item.chave, { instalador_id: e.target.value || null })} aria-label="Instalador do item">
                      <option value="">O mesmo da OS</option>
                      {instaladores.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nome}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}
                {mostrarSeries && produto?.exige_numero_serie && (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Número(s) de série (separe por vírgula)</Label>
                    <Input
                      value={(item.numeros_serie ?? []).join(", ")}
                      onChange={(e) =>
                        alterar(item.chave, {
                          numeros_serie: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      aria-label="Números de série"
                    />
                  </div>
                )}
              </div>
            )}

            {(semPreco || estoqueInsuficiente) && (
              <p className="flex items-center gap-1 text-xs text-warning-foreground">
                <AlertTriangleIcon className="size-3.5" />
                {semPreco ? "Item sem preço — confira a tabela ou a categoria do veículo." : `Estoque atual: ${fmtNum(produto!.estoque_atual)} ${produto!.unidade}.`}
              </p>
            )}
          </div>
        );
      })}

      <Combobox opcoes={opcoes} aoSelecionar={adicionar} placeholder="Buscar serviço, película ou produto..." textoBotao={<span className="inline-flex items-center gap-2"><PlusIcon className="size-4" /> Adicionar item</span>} id="adicionar-item" />

      {itemMedindo && <DialogoMedidas item={itemMedindo} aoSalvar={(m) => aplicarMedidas(itemMedindo, m)} fechar={() => setMedindo(null)} />}
    </div>
  );
}
