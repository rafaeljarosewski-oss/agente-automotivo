"use client";

import { useState } from "react";
import { Loader2Icon, SaveIcon } from "lucide-react";

import type { ClienteResumo, VeiculoResumo } from "@/app/(app)/acoes-comuns";
import { ResumoTotais, useTotais } from "@/app/(app)/orcamentos/editor";
import { Campo } from "@/components/formulario/campo";
import { useAcao } from "@/components/formulario/usar-acao";
import { EditorItens, itensParaEnvio, precoSugerido, type ItemRascunho } from "@/components/itens/editor-itens";
import { SeletorClienteVeiculo } from "@/components/itens/seletor-cliente";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { centavosParaTexto } from "@/lib/dominio/dinheiro";
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/dominio/rotulos";
import type { CatalogoEditor } from "@/lib/consultas/catalogo";
import type { FormaPagamento } from "@/lib/supabase/tipos";
import { salvarOS } from "./actions";

export interface DadosIniciaisOS {
  id?: string;
  cliente: ClienteResumo | null;
  veiculoId: string | null;
  categoriaId: string | null;
  instaladorId: string | null;
  previsao: string;
  km: string;
  formaPagamento: FormaPagamento | "";
  parcelas: number;
  observacoes: string;
  observacoesInternas: string;
  descontoTotal: number;
  itens: ItemRascunho[];
}

export function EditorOS({ catalogo, instaladores, inicial }: { catalogo: CatalogoEditor; instaladores: { id: string; nome: string }[]; inicial: DadosIniciaisOS }) {
  const [cliente, setCliente] = useState<ClienteResumo | null>(inicial.cliente);
  const [veiculoId, setVeiculoId] = useState<string | null>(inicial.veiculoId);
  const [categoriaId, setCategoriaId] = useState<string | null>(inicial.categoriaId);
  const [itens, setItens] = useState<ItemRascunho[]>(inicial.itens);
  const [instalador, setInstalador] = useState(inicial.instaladorId ?? "");
  const [previsao, setPrevisao] = useState(inicial.previsao);
  const [km, setKm] = useState(inicial.km);
  const [forma, setForma] = useState<FormaPagamento | "">(inicial.formaPagamento);
  const [parcelas, setParcelas] = useState(inicial.parcelas);
  const [observacoes, setObservacoes] = useState(inicial.observacoes);
  const [observacoesInternas, setObservacoesInternas] = useState(inicial.observacoesInternas);
  const [descontoTipo, setDescontoTipo] = useState<"valor" | "percentual">("valor");
  const [descontoTexto, setDescontoTexto] = useState(inicial.descontoTotal ? centavosParaTexto(inicial.descontoTotal) : "");
  const { pendente, erro, executar } = useAcao();
  const totais = useTotais(itens, descontoTipo, descontoTexto);
  const parcelavel = forma === "credito_parcelado" || forma === "boleto";

  function mudarVeiculo(v: VeiculoResumo | null) {
    setVeiculoId(v?.id ?? null);
    const nova = v?.categoria_id ?? null;
    if (nova === categoriaId) return;
    setCategoriaId(nova);
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
      salvarOS({
        id: inicial.id,
        cliente_id: cliente.id,
        veiculo_id: veiculoId,
        instalador_id: instalador || null,
        previsao_entrega: previsao || null,
        km,
        forma_pagamento: forma || null,
        parcelas,
        observacoes,
        observacoes_internas: observacoesInternas,
        desconto_tipo: descontoTipo,
        desconto_valor: descontoTexto || "0",
        itens: itensParaEnvio(itens),
      } as Parameters<typeof salvarOS>[0]),
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cliente e veículo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SeletorClienteVeiculo cliente={cliente} veiculoId={veiculoId} categorias={catalogo.categorias} aoMudarCliente={setCliente} aoMudarVeiculo={mudarVeiculo} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo rotulo="Instalador responsável" nome="instalador">
                <NativeSelect value={instalador} onChange={(e) => setInstalador(e.target.value)}>
                  <option value="">Definir depois</option>
                  {instaladores.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </NativeSelect>
              </Campo>
              <Campo rotulo="Previsão de entrega" nome="previsao">
                <Input type="datetime-local" value={previsao} onChange={(e) => setPrevisao(e.target.value)} />
              </Campo>
              <Campo rotulo="Km do veículo" nome="km">
                <Input inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} />
              </Campo>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <EditorItens catalogo={catalogo} categoriaId={categoriaId} itens={itens} setItens={setItens} instaladores={instaladores} mostrarSeries />
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
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Campo rotulo="Forma de pagamento" nome="forma">
                <NativeSelect value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento | "")}>
                  <option value="">Definir na conclusão</option>
                  {Object.entries(ROTULO_FORMA_PAGAMENTO).map(([v, r]) => (
                    <option key={v} value={v}>
                      {r}
                    </option>
                  ))}
                </NativeSelect>
              </Campo>
              {parcelavel && (
                <Campo rotulo="Parcelas" nome="parcelas">
                  <NativeSelect value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </NativeSelect>
                </Campo>
              )}
            </div>
            <Campo rotulo="Observações (aparecem no PDF)" nome="observacoes">
              <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </Campo>
            <Campo rotulo="Observações internas" nome="observacoes_internas">
              <Textarea rows={2} value={observacoesInternas} onChange={(e) => setObservacoesInternas(e.target.value)} />
            </Campo>
            {erro && (
              <Alert variant="destructive">
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
            <Button size="lg" onClick={salvar} disabled={pendente || !cliente || itens.length === 0}>
              {pendente ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} Salvar OS
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
