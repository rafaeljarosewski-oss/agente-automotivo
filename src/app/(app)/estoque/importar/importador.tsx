"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2Icon, FileUpIcon, Loader2Icon } from "lucide-react";

import { aplicarMascara } from "@/components/formulario/mascaras";
import { useAcao } from "@/components/formulario/usar-acao";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatarData } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";
import { formatarCNPJ } from "@/lib/dominio/documentos";
import { analisarXml, importarXml, type PreviaImportacao } from "../actions";

const CRITERIO: Record<string, string> = {
  codigo_fornecedor: "código do fornecedor",
  codigo_barras: "código de barras",
  codigo: "código interno",
  descricao: "descrição parecida",
};

/** Rolo de película: "PELICULA ... ROLO 1,52 X 30M" ou unidade RL */
function pareceRolo(descricao: string, unidade: string): boolean {
  return /PEL[IÍ]CULA|FILM/i.test(descricao) && (/\bROLO\b|\d+[,.]?\d*\s*X\s*\d+\s*M\b/i.test(descricao) || /^(RL|ROLO)$/i.test(unidade));
}

interface Escolha {
  numero: number;
  acao: "vincular" | "criar" | "ignorar";
  produto_id: string;
  quantidade: string;
  tipo_controle: "unidade" | "metro";
  identificacao_rolo: string;
}

export function ImportadorXml() {
  const [xml, setXml] = useState("");
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null);
  const [escolhas, setEscolhas] = useState<Escolha[]>([]);
  const [contas, setContas] = useState(true);
  const analise = useAcao();
  const importacao = useAcao();
  const router = useRouter();

  async function carregar(arquivo: File) {
    const texto = await arquivo.text();
    setXml(texto);
    const dados = new FormData();
    dados.set("xml", arquivo);
    analise.executar(() => analisarXml(dados), {
      silencioso: false,
      aoConcluir: (p) => {
        setPrevia(p);
        setEscolhas(
          p.nota.itens.map((item) => {
            const c = p.casamentos.find((x) => x.numero === item.numero);
            const produto = p.produtos.find((x) => x.id === c?.produto_id);
            const metro = produto ? produto.tipo_controle === "metro" : pareceRolo(item.descricao, item.unidade);
            return {
              numero: item.numero,
              acao: c?.produto_id ? "vincular" : "criar",
              produto_id: c?.produto_id ?? "",
              quantidade: String(item.quantidade).replace(".", ","),
              tipo_controle: metro ? "metro" : "unidade",
              identificacao_rolo: "",
            };
          }),
        );
      },
    });
  }

  const alterar = (numero: number, m: Partial<Escolha>) => setEscolhas((es) => es.map((e) => (e.numero === numero ? { ...e, ...m } : e)));

  if (!previa) {
    return (
      <Card>
        <CardContent className="grid gap-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center hover:border-primary">
            {analise.pendente ? <Loader2Icon className="size-8 animate-spin text-primary" /> : <FileUpIcon className="size-8 text-primary" />}
            <span className="font-medium">Clique para escolher o arquivo XML da NF-e</span>
            <span className="text-sm text-muted-foreground">O fornecedor envia por e-mail; também pode ser baixado no portal da SEFAZ.</span>
            <input type="file" accept=".xml,text/xml,application/xml" className="sr-only" onChange={(e) => e.target.files?.[0] && carregar(e.target.files[0])} data-testid="arquivo-xml" />
          </label>
          {analise.erro && (
            <Alert variant="destructive">
              <AlertDescription>{analise.erro}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  const n = previa.nota;
  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-4">
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Fornecedor</p>
            <p className="font-medium">{n.fornecedor.nome}</p>
            <p className="text-muted-foreground">{formatarCNPJ(n.fornecedor.cnpj)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Nota</p>
            <p className="font-medium">
              nº {n.numero} série {n.serie}
            </p>
            <p className="text-muted-foreground">{formatarData(n.data_emissao)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Total</p>
            <p className="font-medium">{formatarMoeda(n.valor_total_centavos)}</p>
            <p className="text-muted-foreground">{n.duplicatas.length ? `${n.duplicatas.length} duplicata(s)` : "à vista"}</p>
          </div>
        </CardContent>
      </Card>
      {previa.jaImportada && (
        <Alert variant="destructive">
          <AlertDescription>Esta nota já foi importada antes.</AlertDescription>
        </Alert>
      )}
      <Card className="py-0">
        <CardHeader className="pt-5">
          <CardTitle>Itens da nota</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pb-5">
          {n.itens.map((item) => {
            const e = escolhas.find((x) => x.numero === item.numero)!;
            const c = previa.casamentos.find((x) => x.numero === item.numero);
            return (
              <div key={item.numero} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1.4fr_1.6fr_auto]" data-testid="item-xml">
                <div>
                  <p className="font-medium">{item.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    Cód. {item.codigo} · {item.quantidade.toLocaleString("pt-BR")} {item.unidade} × {formatarMoeda(item.valor_unitario_centavos)} = {formatarMoeda(item.valor_total_centavos)}
                    {item.ncm ? ` · NCM ${item.ncm}` : ""}
                  </p>
                  {c?.criterio && (
                    <Badge variant="info" className="mt-1">
                      encontrado por {CRITERIO[c.criterio]}
                    </Badge>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-[11rem_1fr]">
                  <NativeSelect value={e.acao} onChange={(ev) => alterar(item.numero, { acao: ev.target.value as Escolha["acao"] })} aria-label="O que fazer com o item">
                    <option value="vincular">Produto existente</option>
                    <option value="criar">Criar produto</option>
                    <option value="ignorar">Não lançar</option>
                  </NativeSelect>
                  {e.acao === "vincular" && (
                    <NativeSelect value={e.produto_id} onChange={(ev) => alterar(item.numero, { produto_id: ev.target.value })} aria-label="Produto">
                      <option value="">Escolha o produto...</option>
                      {previa.produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                  {e.acao === "criar" && (
                    <NativeSelect value={e.tipo_controle} onChange={(ev) => alterar(item.numero, { tipo_controle: ev.target.value as Escolha["tipo_controle"] })} aria-label="Controle de estoque">
                      <option value="unidade">Controle por unidade</option>
                      <option value="metro">Rolo (controle por metro)</option>
                    </NativeSelect>
                  )}
                </div>
                {e.acao !== "ignorar" && (
                  <div className="grid grid-cols-2 gap-2 lg:w-56">
                    <Input
                      inputMode="decimal"
                      value={e.quantidade}
                      onChange={(ev) => alterar(item.numero, { quantidade: aplicarMascara("decimal", ev.target.value) })}
                      aria-label="Quantidade que entra no estoque"
                      title="Quantidade que entra no estoque (para rolos, informe os metros)"
                    />
                    {(e.tipo_controle === "metro" || previa.produtos.find((p) => p.id === e.produto_id)?.tipo_controle === "metro") && (
                      <Input placeholder="Lote do rolo" value={e.identificacao_rolo} onChange={(ev) => alterar(item.numero, { identificacao_rolo: ev.target.value })} aria-label="Identificação do rolo" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
      {n.duplicatas.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={contas} onCheckedChange={setContas} /> Lançar {n.duplicatas.length} duplicata(s) em contas a pagar
        </label>
      )}
      {importacao.erro && (
        <Alert variant="destructive">
          <AlertDescription>{importacao.erro}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setPrevia(null)}>
          Escolher outro arquivo
        </Button>
        <Button
          disabled={importacao.pendente || previa.jaImportada || escolhas.some((e) => e.acao === "vincular" && !e.produto_id)}
          onClick={() =>
            importacao.executar(
              () =>
                importarXml({
                  xml,
                  criar_contas_pagar: contas,
                  itens: escolhas.map((e) => ({ numero: e.numero, acao: e.acao, produto_id: e.produto_id || null, quantidade: e.quantidade, tipo_controle: e.tipo_controle, identificacao_rolo: e.identificacao_rolo || null })),
                }),
              { aoConcluir: () => router.push("/estoque") },
            )
          }
        >
          {importacao.pendente ? <Loader2Icon className="animate-spin" /> : <CheckCircle2Icon />} Confirmar entrada no estoque
        </Button>
      </div>
    </div>
  );
}
