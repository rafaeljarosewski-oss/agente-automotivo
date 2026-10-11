"use client";

import { useState } from "react";
import { Loader2Icon, PackagePlusIcon, SlidersHorizontalIcon } from "lucide-react";

import { Campo } from "@/components/formulario/campo";
import { aplicarMascara } from "@/components/formulario/mascaras";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { centavosParaTexto } from "@/lib/dominio/dinheiro";
import { ajustarEstoque, registrarEntrada } from "../actions";

export function FormulariosEstoque({
  produto,
  rolos,
}: {
  produto: { id: string; unidade: string; tipo_controle: "unidade" | "metro"; exige_numero_serie: boolean; custo_centavos: number };
  rolos: { id: string; identificacao: string | null; saldo: number }[];
}) {
  const metro = produto.tipo_controle === "metro";
  const [entrada, setEntrada] = useState({ quantidade: "", custo: centavosParaTexto(produto.custo_centavos), rolo: "", series: "", motivo: "" });
  const [ajuste, setAjuste] = useState({ sinal: "-", quantidade: "", motivo: "", rolo: "" });
  const e1 = useAcao();
  const e2 = useAcao();

  return (
    <div className="grid h-fit gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Entrada de estoque</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              e1.executar(
                () =>
                  registrarEntrada({
                    produto_id: produto.id,
                    quantidade: entrada.quantidade,
                    custo_unitario_centavos: entrada.custo,
                    motivo: entrada.motivo || "Entrada manual",
                    identificacao_rolo: entrada.rolo || null,
                    numeros_serie: entrada.series.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
                  }),
                { aoConcluir: () => setEntrada({ ...entrada, quantidade: "", rolo: "", series: "", motivo: "" }) },
              );
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo={metro ? "Metragem do rolo (m)" : `Quantidade (${produto.unidade})`} nome="entrada-qtd">
                <Input inputMode="decimal" value={entrada.quantidade} onChange={(e) => setEntrada({ ...entrada, quantidade: aplicarMascara("decimal", e.target.value) })} required />
              </Campo>
              <Campo rotulo={metro ? "Custo por metro (R$)" : "Custo unit. (R$)"} nome="entrada-custo">
                <Input inputMode="decimal" value={entrada.custo} onChange={(e) => setEntrada({ ...entrada, custo: aplicarMascara("dinheiro", e.target.value) })} />
              </Campo>
            </div>
            {metro && (
              <Campo rotulo="Identificação do rolo" nome="entrada-rolo" ajuda="Lote ou etiqueta. Cada entrada abre um rolo novo.">
                <Input value={entrada.rolo} onChange={(e) => setEntrada({ ...entrada, rolo: e.target.value })} />
              </Campo>
            )}
            {produto.exige_numero_serie && (
              <Campo rotulo="Números de série" nome="entrada-series" ajuda="Um por linha (ou separados por vírgula). Opcional: também podem ser informados na saída.">
                <Textarea rows={3} value={entrada.series} onChange={(e) => setEntrada({ ...entrada, series: e.target.value })} />
              </Campo>
            )}
            <Campo rotulo="Observação" nome="entrada-motivo">
              <Input value={entrada.motivo} onChange={(e) => setEntrada({ ...entrada, motivo: e.target.value })} placeholder="Ex.: compra no balcão do fornecedor" />
            </Campo>
            <Button type="submit" disabled={e1.pendente}>
              {e1.pendente ? <Loader2Icon className="animate-spin" /> : <PackagePlusIcon />} Registrar entrada
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ajuste (inventário, perda, quebra)</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              e2.executar(
                () =>
                  ajustarEstoque({
                    produto_id: produto.id,
                    quantidade: `${ajuste.sinal}${ajuste.quantidade}`,
                    motivo: ajuste.motivo,
                    rolo_id: ajuste.rolo || null,
                  }),
                { aoConcluir: () => setAjuste({ sinal: "-", quantidade: "", motivo: "", rolo: "" }) },
              );
            }}
          >
            <div className="grid grid-cols-[6rem_1fr] gap-3">
              <Campo rotulo="Tipo" nome="ajuste-sinal">
                <NativeSelect value={ajuste.sinal} onChange={(e) => setAjuste({ ...ajuste, sinal: e.target.value })}>
                  <option value="-">Retirar</option>
                  <option value="">Somar</option>
                </NativeSelect>
              </Campo>
              <Campo rotulo={`Quantidade (${produto.unidade})`} nome="ajuste-qtd">
                <Input inputMode="decimal" value={ajuste.quantidade} onChange={(e) => setAjuste({ ...ajuste, quantidade: aplicarMascara("decimal", e.target.value) })} required />
              </Campo>
            </div>
            {metro && rolos.length > 0 && (
              <Campo rotulo="Rolo" nome="ajuste-rolo">
                <NativeSelect value={ajuste.rolo} onChange={(e) => setAjuste({ ...ajuste, rolo: e.target.value })}>
                  <option value="">Sem rolo específico</option>
                  {rolos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.identificacao ?? "Rolo"} ({r.saldo.toLocaleString("pt-BR")} m)
                    </option>
                  ))}
                </NativeSelect>
              </Campo>
            )}
            <Campo rotulo="Motivo (obrigatório)" nome="ajuste-motivo">
              <Input value={ajuste.motivo} onChange={(e) => setAjuste({ ...ajuste, motivo: e.target.value })} placeholder="Ex.: contagem de inventário, película danificada" required />
            </Campo>
            <Button type="submit" variant="outline" disabled={e2.pendente || !ajuste.motivo.trim()}>
              {e2.pendente ? <Loader2Icon className="animate-spin" /> : <SlidersHorizontalIcon />} Registrar ajuste
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
