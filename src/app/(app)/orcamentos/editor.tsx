"use client";

import { useState } from "react";
import { Loader2Icon, SaveIcon } from "lucide-react";

import type { ClienteResumo, VeiculoResumo } from "@/app/(app)/acoes-comuns";
import { Campo } from "@/components/formulario/campo";
import { aplicarMascara } from "@/components/formulario/mascaras";
import { useAcao } from "@/components/formulario/usar-acao";
import { EditorItens, itensParaEnvio, precoSugerido, valoresItem, type ItemRascunho } from "@/components/itens/editor-itens";
import { SeletorClienteVeiculo } from "@/components/itens/seletor-cliente";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calcularTotais, descontoPercentual } from "@/lib/dominio/calculos";
import { centavosParaTexto, formatarMoeda, textoParaCentavos } from "@/lib/dominio/dinheiro";
import type { CatalogoEditor } from "@/lib/consultas/catalogo";
import { paraNumero } from "@/lib/validacao/comum";
import { salvarOrcamento } from "./actions";

export interface DadosIniciaisOrcamento {
  id?: string;
  cliente: ClienteResumo | null;
  veiculoId: string | null;
  categoriaId: string | null;
  validade: string;
  observacoes: string;
  descontoTotal: number;
  itens: ItemRascunho[];
}

/** Resumo de totais com desconto no total (valor ou %) — usado no orçamento e na OS */
export function useTotais(itens: ItemRascunho[], descontoTipo: "valor" | "percentual", descontoTexto: string) {
  const base = itens
    .map(valoresItem)
    .filter((v) => v.quantidade > 0)
    .map((v) => ({ quantidade: v.quantidade, preco_unitario_centavos: v.preco, desconto_centavos: v.desconto }));
  const liquido = calcularTotais(base, 0).total_centavos;
  const descontoCentavos =
    descontoTipo === "valor" ? (textoParaCentavos(descontoTexto) ?? 0) : descontoPercentual(liquido, Math.min(100, Math.max(0, paraNumero(descontoTexto) ?? 0)));
  return calcularTotais(base, descontoCentavos);
}

export function ResumoTotais({
  totais,
  descontoTipo,
  setDescontoTipo,
  descontoTexto,
  setDescontoTexto,
}: {
  totais: ReturnType<typeof calcularTotais>;
  descontoTipo: "valor" | "percentual";
  setDescontoTipo: (t: "valor" | "percentual") => void;
  descontoTexto: string;
  setDescontoTexto: (t: string) => void;
}) {
  return (
    <div className="grid gap-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatarMoeda(totais.subtotal_centavos)}</span>
      </div>
      {totais.desconto_itens_centavos > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Descontos nos itens</span>
          <span>− {formatarMoeda(totais.desconto_itens_centavos)}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">Desconto no total</span>
        <div className="flex w-44 gap-1">
          <NativeSelect className="w-16 px-2" value={descontoTipo} onChange={(e) => setDescontoTipo(e.target.value as "valor" | "percentual")} aria-label="Tipo de desconto">
            <option value="valor">R$</option>
            <option value="percentual">%</option>
          </NativeSelect>
          <Input
            className="text-right"
            inputMode="decimal"
            value={descontoTexto}
            onChange={(e) => setDescontoTexto(aplicarMascara(descontoTipo === "valor" ? "dinheiro" : "decimal", e.target.value))}
            aria-label="Desconto no total"
          />
        </div>
      </div>
      {totais.desconto_total_centavos > 0 && descontoTipo === "percentual" && (
        <div className="flex justify-end text-xs text-muted-foreground">− {formatarMoeda(totais.desconto_total_centavos)}</div>
      )}
      <div className="flex justify-between border-t pt-2 text-lg font-semibold">
        <span>Total</span>
        <span data-testid="total-geral">{formatarMoeda(totais.total_centavos)}</span>
      </div>
    </div>
  );
}

export function EditorOrcamento({ catalogo, inicial }: { catalogo: CatalogoEditor; inicial: DadosIniciaisOrcamento }) {
  const [cliente, setCliente] = useState<ClienteResumo | null>(inicial.cliente);
  const [veiculoId, setVeiculoId] = useState<string | null>(inicial.veiculoId);
  const [categoriaId, setCategoriaId] = useState<string | null>(inicial.categoriaId);
  const [itens, setItens] = useState<ItemRascunho[]>(inicial.itens);
  const [validade, setValidade] = useState(inicial.validade);
  const [observacoes, setObservacoes] = useState(inicial.observacoes);
  const [descontoTipo, setDescontoTipo] = useState<"valor" | "percentual">("valor");
  const [descontoTexto, setDescontoTexto] = useState(inicial.descontoTotal ? centavosParaTexto(inicial.descontoTotal) : "");
  const { pendente, erro, executar } = useAcao();
  const totais = useTotais(itens, descontoTipo, descontoTexto);

  function mudarVeiculo(v: VeiculoResumo | null) {
    setVeiculoId(v?.id ?? null);
    const nova = v?.categoria_id ?? null;
    if (nova === categoriaId) return;
    setCategoriaId(nova);
    // Atualiza os preços que dependem da categoria (exceto os digitados à mão)
    setItens((atuais) =>
      atuais.map((i) => {
        if (i.precoManual && !i.linha_pelicula_id) return i;
        const s = precoSugerido(catalogo, i, nova);
        return s.preco !== null ? { ...i, preco: centavosParaTexto(s.preco), consumo_metros: s.consumo ?? i.consumo_metros, precoManual: false } : i;
      }),
    );
  }

  function salvar() {
    if (!cliente) return;
    executar(() =>
      salvarOrcamento({
        id: inicial.id,
        cliente_id: cliente.id,
        veiculo_id: veiculoId,
        validade,
        observacoes,
        desconto_tipo: descontoTipo,
        desconto_valor: descontoTexto || "0",
        itens: itensParaEnvio(itens),
      } as Parameters<typeof salvarOrcamento>[0]),
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cliente e veículo</CardTitle>
          </CardHeader>
          <CardContent>
            <SeletorClienteVeiculo
              cliente={cliente}
              veiculoId={veiculoId}
              categorias={catalogo.categorias}
              aoMudarCliente={setCliente}
              aoMudarVeiculo={mudarVeiculo}
            />
            {cliente && !veiculoId && itens.some((i) => i.linha_pelicula_id) && (
              <Alert variant="warning" className="mt-3">
                <AlertDescription>Escolha o veículo para usar o preço da tabela de películas.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <EditorItens catalogo={catalogo} categoriaId={categoriaId} itens={itens} setItens={setItens} />
          </CardContent>
        </Card>
      </div>

      <div className="grid h-fit gap-6 lg:sticky lg:top-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ResumoTotais totais={totais} descontoTipo={descontoTipo} setDescontoTipo={setDescontoTipo} descontoTexto={descontoTexto} setDescontoTexto={setDescontoTexto} />
            <Campo rotulo="Válido até" nome="validade">
              <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
            </Campo>
            <Campo rotulo="Observações" nome="observacoes">
              <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Condições de pagamento, prazo de execução, garantia..." />
            </Campo>
            {erro && (
              <Alert variant="destructive">
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
            <Button size="lg" onClick={salvar} disabled={pendente || !cliente || itens.length === 0}>
              {pendente ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} Salvar orçamento
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
