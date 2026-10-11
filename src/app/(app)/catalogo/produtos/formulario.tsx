"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangleIcon, Loader2Icon, SaveIcon, Trash2Icon } from "lucide-react";

import { Confirmar } from "@/components/comum/confirmar";
import { Campo } from "@/components/formulario/campo";
import { InputMascara } from "@/components/formulario/input-mascara";
import { useAcao } from "@/components/formulario/usar-acao";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { centavosParaTexto } from "@/lib/dominio/dinheiro";
import { ROTULO_CATEGORIA_PRODUTO } from "@/lib/dominio/rotulos";
import type { Tabela } from "@/lib/supabase/tipos";
import { schemaProduto, type ProdutoEntrada } from "@/lib/validacao/catalogo";
import { excluirProduto, salvarProduto } from "../actions";

const num = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(".", ","));

export function FormularioProduto({ produto, somenteLeitura }: { produto?: Tabela<"produtos">; somenteLeitura: boolean }) {
  const form = useForm<ProdutoEntrada>({
    resolver: zodResolver(schemaProduto) as never,
    defaultValues: (produto
      ? {
          ...produto,
          preco_venda_centavos: centavosParaTexto(produto.preco_venda_centavos),
          custo_centavos: centavosParaTexto(produto.custo_centavos),
          estoque_minimo: num(produto.estoque_minimo),
          largura_rolo_m: num(produto.largura_rolo_m),
          aliquota_icms: num(produto.aliquota_icms),
          garantia_dias: produto.garantia_dias ?? "",
        }
      : {
          nome: "",
          categoria: "acessorio",
          tipo_controle: "unidade",
          unidade: "UN",
          exige_numero_serie: false,
          preco_venda_centavos: "",
          custo_centavos: "",
          estoque_minimo: "0",
          ativo: true,
          origem: 0,
          cfop: "5102",
          csosn: "102",
          cst_pis: "99",
          cst_cofins: "99",
          cst_ibs_cbs: "000",
          cclass_trib: "000001",
          fiscal_validado: false,
        }) as ProdutoEntrada,
  });
  const tipoControle = useWatch({ control: form.control, name: "tipo_controle" });
  const validado = useWatch({ control: form.control, name: "fiscal_validado" });
  const { pendente, executar } = useAcao();
  const exclusao = useAcao();
  const erros = form.formState.errors;

  return (
    <form className="grid gap-6" onSubmit={form.handleSubmit(() => executar(() => salvarProduto(form.getValues()), { form }))}>
      <fieldset disabled={somenteLeitura} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do produto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-6">
            <Campo rotulo="Nome" nome="nome" erro={erros.nome?.message} obrigatorio className="sm:col-span-4">
              <Input {...form.register("nome")} />
            </Campo>
            <Campo rotulo="Categoria" nome="categoria" className="sm:col-span-2">
              <NativeSelect {...form.register("categoria")}>
                {Object.entries(ROTULO_CATEGORIA_PRODUTO).map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </NativeSelect>
            </Campo>
            <Campo rotulo="Código interno" nome="codigo" className="sm:col-span-2">
              <Input {...form.register("codigo")} />
            </Campo>
            <Campo rotulo="Código de barras (EAN)" nome="codigo_barras" className="sm:col-span-2">
              <Input inputMode="numeric" {...form.register("codigo_barras")} />
            </Campo>
            <Campo rotulo="Marca" nome="marca" className="sm:col-span-2">
              <Input {...form.register("marca")} />
            </Campo>
            <Campo rotulo="Preço de venda (R$)" nome="preco_venda_centavos" erro={erros.preco_venda_centavos?.message} obrigatorio className="sm:col-span-2">
              <Controller control={form.control} name="preco_venda_centavos" render={({ field }) => <InputMascara mascara="dinheiro" {...field} value={String(field.value ?? "")} />} />
            </Campo>
            <Campo rotulo="Custo (R$)" nome="custo_centavos" className="sm:col-span-2">
              <Controller control={form.control} name="custo_centavos" render={({ field }) => <InputMascara mascara="dinheiro" {...field} value={String(field.value ?? "")} />} />
            </Campo>
            <Campo rotulo="Garantia (dias)" nome="garantia_dias" className="sm:col-span-2">
              <Input inputMode="numeric" {...form.register("garantia_dias")} />
            </Campo>
            <Campo rotulo="Descrição" nome="descricao" className="sm:col-span-6">
              <Textarea rows={2} {...form.register("descricao")} />
            </Campo>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estoque</CardTitle>
            <CardDescription>Película em rolo é controlada por metro; os demais por unidade.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-6">
            <Campo rotulo="Controle" nome="tipo_controle" className="sm:col-span-2">
              <NativeSelect
                {...form.register("tipo_controle", {
                  onChange: (e) => {
                    if (e.target.value === "metro") {
                      form.setValue("unidade", "M");
                      form.setValue("exige_numero_serie", false);
                    }
                  },
                })}
              >
                <option value="unidade">Por unidade</option>
                <option value="metro">Por metro (rolo)</option>
              </NativeSelect>
            </Campo>
            <Campo rotulo="Unidade" nome="unidade" erro={erros.unidade?.message} ajuda="UN, PAR, KG, M, L..." className="sm:col-span-1">
              <Input className="uppercase" {...form.register("unidade")} />
            </Campo>
            <Campo rotulo="Estoque mínimo" nome="estoque_minimo" erro={erros.estoque_minimo?.message} className="sm:col-span-1">
              <Input inputMode="decimal" {...form.register("estoque_minimo")} />
            </Campo>
            {tipoControle === "metro" ? (
              <Campo rotulo="Largura do rolo (m)" nome="largura_rolo_m" erro={erros.largura_rolo_m?.message} className="sm:col-span-2">
                <Input inputMode="decimal" placeholder="1,52" {...form.register("largura_rolo_m")} />
              </Campo>
            ) : (
              <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-2">
                <Controller
                  control={form.control}
                  name="exige_numero_serie"
                  render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />}
                />
                Exige número de série na saída
              </label>
            )}
            {produto && (
              <p className="text-sm text-muted-foreground sm:col-span-6">
                Saldo atual:{" "}
                <strong>
                  {Number(produto.estoque_atual).toLocaleString("pt-BR")} {produto.unidade}
                </strong>{" "}
                — use a tela de Estoque para entradas e ajustes.
              </p>
            )}
            <label className="flex items-center gap-2 text-sm sm:col-span-6">
              <Controller control={form.control} name="ativo" render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />} />
              Produto ativo (aparece nos orçamentos)
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados fiscais (NF-e / NFC-e)</CardTitle>
            <CardDescription>Confirme estes códigos com o contador antes de emitir notas em produção.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-6">
            {!validado && (
              <Alert variant="warning" className="sm:col-span-6">
                <AlertTriangleIcon />
                <AlertDescription>Dados fiscais ainda não validados pelo contador.</AlertDescription>
              </Alert>
            )}
            <Campo rotulo="NCM" nome="ncm" erro={erros.ncm?.message} className="sm:col-span-2">
              <Input inputMode="numeric" {...form.register("ncm")} />
            </Campo>
            <Campo rotulo="CEST" nome="cest" erro={erros.cest?.message} className="sm:col-span-2">
              <Input inputMode="numeric" {...form.register("cest")} />
            </Campo>
            <Campo rotulo="CFOP" nome="cfop" erro={erros.cfop?.message} className="sm:col-span-2">
              <Input inputMode="numeric" {...form.register("cfop")} />
            </Campo>
            <Campo rotulo="Origem" nome="origem" className="sm:col-span-2">
              <NativeSelect {...form.register("origem")}>
                <option value="0">0 — Nacional</option>
                <option value="1">1 — Estrangeira (importação direta)</option>
                <option value="2">2 — Estrangeira (mercado interno)</option>
                <option value="3">3 — Nacional, conteúdo importado &gt; 40%</option>
                <option value="5">5 — Nacional, conteúdo importado ≤ 40%</option>
                <option value="8">8 — Nacional, conteúdo importado &gt; 70%</option>
              </NativeSelect>
            </Campo>
            <Campo rotulo="CSOSN (Simples)" nome="csosn" erro={erros.csosn?.message} ajuda="102, 103, 300, 400, 500 ou 900" className="sm:col-span-2">
              <Input inputMode="numeric" {...form.register("csosn")} />
            </Campo>
            <Campo rotulo="CST ICMS (Regime Normal)" nome="cst_icms" erro={erros.cst_icms?.message} className="sm:col-span-1">
              <Input inputMode="numeric" {...form.register("cst_icms")} />
            </Campo>
            <Campo rotulo="Alíq. ICMS %" nome="aliquota_icms" className="sm:col-span-1">
              <Input inputMode="decimal" {...form.register("aliquota_icms")} />
            </Campo>
            <Campo rotulo="CST PIS" nome="cst_pis" erro={erros.cst_pis?.message} className="sm:col-span-1">
              <Input inputMode="numeric" {...form.register("cst_pis")} />
            </Campo>
            <Campo rotulo="CST COFINS" nome="cst_cofins" erro={erros.cst_cofins?.message} className="sm:col-span-1">
              <Input inputMode="numeric" {...form.register("cst_cofins")} />
            </Campo>
            <Campo rotulo="CST IBS/CBS" nome="cst_ibs_cbs" erro={erros.cst_ibs_cbs?.message} className="sm:col-span-2">
              <Input inputMode="numeric" {...form.register("cst_ibs_cbs")} />
            </Campo>
            <Campo rotulo="cClassTrib (IBS/CBS)" nome="cclass_trib" erro={erros.cclass_trib?.message} className="sm:col-span-2">
              <Input inputMode="numeric" {...form.register("cclass_trib")} />
            </Campo>
            <label className="flex items-center gap-2 text-sm sm:col-span-6">
              <Controller
                control={form.control}
                name="fiscal_validado"
                render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />}
              />
              Dados fiscais validados pelo contador
            </label>
          </CardContent>
        </Card>
      </fieldset>

      {!somenteLeitura && (
        <div className="flex flex-wrap justify-between gap-2">
          {produto ? (
            <Confirmar titulo="Excluir este produto?" descricao="Ele deixa de aparecer no catálogo. O histórico é mantido." destrutivo textoConfirmar="Excluir" aoConfirmar={() => exclusao.executar(() => excluirProduto(produto.id))}>
              <Button type="button" variant="ghost" className="text-destructive">
                <Trash2Icon /> Excluir
              </Button>
            </Confirmar>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} Salvar produto
          </Button>
        </div>
      )}
    </form>
  );
}
