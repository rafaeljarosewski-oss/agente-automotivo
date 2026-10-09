"use client";

import { useState } from "react";
import { ArrowDownToLineIcon, ArrowUpFromLineIcon, Loader2Icon, LockIcon, UnlockIcon } from "lucide-react";

import { Campo } from "@/components/formulario/campo";
import { aplicarMascara } from "@/components/formulario/mascaras";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { centavosParaTexto, formatarMoeda, textoParaCentavos } from "@/lib/dominio/dinheiro";
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/dominio/rotulos";
import type { FormaPagamento } from "@/lib/supabase/tipos";
import { cn } from "@/lib/utils";
import { abrirCaixa, fecharCaixa, movimentarCaixa } from "../actions";

export function AberturaCaixa() {
  const [valor, setValor] = useState("");
  const { pendente, executar } = useAcao();
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Abrir caixa</CardTitle>
        <CardDescription>Informe o fundo de troco em dinheiro que está na gaveta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            executar(() => abrirCaixa({ valor: valor || "0" }));
          }}
        >
          <Input inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(aplicarMascara("dinheiro", e.target.value))} aria-label="Fundo de troco" />
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2Icon className="animate-spin" /> : <UnlockIcon />} Abrir caixa
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DialogoMovimento({ tipo, fechar }: { tipo: "sangria" | "reforco"; fechar: () => void }) {
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const { pendente, executar } = useAcao();
  return (
    <Dialog open onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tipo === "sangria" ? "Sangria (retirada de dinheiro)" : "Reforço (entrada de dinheiro)"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Campo rotulo="Valor (R$)" nome="valor-mov">
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(aplicarMascara("dinheiro", e.target.value))} />
          </Campo>
          <Campo rotulo="Motivo" nome="motivo-mov">
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={tipo === "sangria" ? "Ex.: depósito no banco" : "Ex.: troco extra"} />
          </Campo>
        </div>
        <DialogFooter>
          <Button disabled={pendente || !valor || !descricao.trim()} onClick={() => executar(() => movimentarCaixa({ tipo, valor, descricao }), { aoConcluir: fechar })}>
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoFechamento({ resumo, fechar }: { resumo: { forma: FormaPagamento; esperado: number }[]; fechar: () => void }) {
  const relevantes = resumo.filter((r) => r.esperado !== 0 || r.forma === "dinheiro");
  const [contado, setContado] = useState<Record<string, string>>(Object.fromEntries(relevantes.map((r) => [r.forma, centavosParaTexto(r.esperado)])));
  const [obs, setObs] = useState("");
  const { pendente, executar } = useAcao();
  const diferenca = relevantes.reduce((s, r) => s + ((textoParaCentavos(contado[r.forma]) ?? 0) - r.esperado), 0);
  return (
    <Dialog open onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar caixa</DialogTitle>
          <DialogDescription>Confira o que realmente entrou em cada forma de pagamento (dinheiro na gaveta, extrato do Pix e da maquininha).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {relevantes.map((r) => {
            const dif = (textoParaCentavos(contado[r.forma]) ?? 0) - r.esperado;
            return (
              <div key={r.forma} className="grid grid-cols-[1fr_8rem] items-center gap-2">
                <div>
                  <p className="text-sm font-medium">{ROTULO_FORMA_PAGAMENTO[r.forma]}</p>
                  <p className="text-xs text-muted-foreground">
                    esperado {formatarMoeda(r.esperado)}
                    {dif !== 0 && <span className={cn("ml-1 font-medium", dif < 0 ? "text-destructive" : "text-success")}>({dif > 0 ? "+" : ""}{formatarMoeda(dif)})</span>}
                  </p>
                </div>
                <Input inputMode="decimal" className="text-right" value={contado[r.forma] ?? ""} onChange={(e) => setContado({ ...contado, [r.forma]: aplicarMascara("dinheiro", e.target.value) })} aria-label={`Valor conferido em ${ROTULO_FORMA_PAGAMENTO[r.forma]}`} />
              </div>
            );
          })}
          <Textarea rows={2} placeholder="Observações do fechamento" value={obs} onChange={(e) => setObs(e.target.value)} />
          <p className={cn("text-sm font-medium", diferenca < 0 ? "text-destructive" : diferenca > 0 ? "text-success" : "")}>
            Diferença total: {formatarMoeda(diferenca)}
          </p>
        </div>
        <DialogFooter>
          <Button
            disabled={pendente}
            onClick={() => executar(() => fecharCaixa({ conferencia: Object.fromEntries(Object.entries(contado).map(([k, v]) => [k, v || "0"])), observacoes: obs }), { aoConcluir: fechar })}
          >
            {pendente ? <Loader2Icon className="animate-spin" /> : <LockIcon />} Fechar caixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OperacoesCaixa({ resumo }: { resumo: { forma: FormaPagamento; esperado: number }[] }) {
  const [movimento, setMovimento] = useState<"sangria" | "reforco" | null>(null);
  const [fechando, setFechando] = useState(false);
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Operações</CardTitle>
        <CardDescription>Recebimentos de títulos entram aqui automaticamente.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button variant="outline" onClick={() => setMovimento("sangria")}>
          <ArrowUpFromLineIcon /> Sangria
        </Button>
        <Button variant="outline" onClick={() => setMovimento("reforco")}>
          <ArrowDownToLineIcon /> Reforço
        </Button>
        <Button onClick={() => setFechando(true)}>
          <LockIcon /> Fechar caixa
        </Button>
      </CardContent>
      {movimento && <DialogoMovimento tipo={movimento} fechar={() => setMovimento(null)} />}
      {fechando && <DialogoFechamento resumo={resumo} fechar={() => setFechando(false)} />}
    </Card>
  );
}
