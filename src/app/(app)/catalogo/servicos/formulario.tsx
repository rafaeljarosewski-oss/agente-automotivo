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
import { ROTULO_CATEGORIA_SERVICO, ROTULO_TIPO_PRECO } from "@/lib/dominio/rotulos";
import type { Tabela } from "@/lib/supabase/tipos";
import { schemaServico, type ServicoEntrada } from "@/lib/validacao/catalogo";
import { excluirServico, salvarServico } from "../actions";

const num = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(".", ","));

export function FormularioServico({
  servico,
  categorias,
  rolos,
  precos,
  somenteLeitura,
}: {
  servico?: Tabela<"servicos">;
  categorias: { id: string; nome: string }[];
  rolos: { id: string; nome: string }[];
  precos: { categoria_id: string; preco_centavos: number }[];
  somenteLeitura: boolean;
}) {
  const precosIniciais = Object.fromEntries(
    categorias.map((c) => {
      const p = precos.find((x) => x.categoria_id === c.id);
      return [c.id, p ? centavosParaTexto(p.preco_centavos) : ""];
    }),
  );
  const form = useForm<ServicoEntrada>({
    resolver: zodResolver(schemaServico) as never,
    defaultValues: (servico
      ? {
          ...servico,
          preco_centavos: centavosParaTexto(servico.preco_centavos),
          comissao_fixo_centavos: centavosParaTexto(servico.comissao_fixo_centavos),
          comissao_percentual: num(servico.comissao_percentual),
          perda_percentual: num(servico.perda_percentual),
          aliquota_iss: num(servico.aliquota_iss),
          tempo_estimado_min: servico.tempo_estimado_min ?? "",
          garantia_dias: servico.garantia_dias ?? "",
          precos_categoria: precosIniciais,
        }
      : {
          nome: "",
          categoria: "instalacao",
          tipo_preco: "fixo",
          preco_centavos: "",
          precos_categoria: precosIniciais,
          perda_percentual: "10",
          comissao_tipo: "nenhuma",
          comissao_percentual: "0",
          comissao_fixo_centavos: "",
          ativo: true,
          codigo_servico: "14.01.01",
          aliquota_iss: "",
          cst_ibs_cbs: "000",
          cclass_trib: "000001",
          fiscal_validado: false,
        }) as ServicoEntrada,
  });
  const tipoPreco = useWatch({ control: form.control, name: "tipo_preco" });
  const comissaoTipo = useWatch({ control: form.control, name: "comissao_tipo" });
  const validado = useWatch({ control: form.control, name: "fiscal_validado" });
  const { pendente, executar } = useAcao();
  const exclusao = useAcao();
  const erros = form.formState.errors;

  return (
    <form className="grid gap-6" onSubmit={form.handleSubmit(() => executar(() => salvarServico(form.getValues()), { form }))}>
      <fieldset disabled={somenteLeitura} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do serviço</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-6">
            <Campo rotulo="Nome" nome="nome" erro={erros.nome?.message} obrigatorio className="sm:col-span-4">
              <Input {...form.register("nome")} />
            </Campo>
            <Campo rotulo="Código" nome="codigo" className="sm:col-span-2">
              <Input {...form.register("codigo")} />
            </Campo>
            <Campo rotulo="Categoria" nome="categoria" className="sm:col-span-2">
              <NativeSelect {...form.register("categoria")}>
                {Object.entries(ROTULO_CATEGORIA_SERVICO).map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </NativeSelect>
            </Campo>
            <Campo rotulo="Tempo estimado (min)" nome="tempo_estimado_min" className="sm:col-span-2">
              <Input inputMode="numeric" {...form.register("tempo_estimado_min")} />
            </Campo>
            <Campo rotulo="Garantia (dias)" nome="garantia_dias" className="sm:col-span-2">
              <Input inputMode="numeric" {...form.register("garantia_dias")} />
            </Campo>
            <Campo rotulo="Descrição" nome="descricao" className="sm:col-span-6">
              <Textarea rows={2} {...form.register("descricao")} />
            </Campo>
            <label className="flex items-center gap-2 text-sm sm:col-span-6">
              <Controller control={form.control} name="ativo" render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />} />
              Serviço ativo
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preço</CardTitle>
            <CardDescription>O preço já vem preenchido no orçamento conforme a categoria do veículo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-6">
            <Campo rotulo="Forma de cobrança" nome="tipo_preco" className="sm:col-span-3">
              <NativeSelect {...form.register("tipo_preco")}>
                {Object.entries(ROTULO_TIPO_PRECO).map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </NativeSelect>
            </Campo>
            {tipoPreco !== "pelicula" && (
              <Campo
                rotulo={tipoPreco === "m2" ? "Preço por m² (R$)" : tipoPreco === "categoria" ? "Preço padrão (R$)" : "Preço (R$)"}
                nome="preco_centavos"
                erro={erros.preco_centavos?.message}
                ajuda={tipoPreco === "categoria" ? "Usado quando o veículo não tem preço específico." : undefined}
                className="sm:col-span-3"
              >
                <Controller control={form.control} name="preco_centavos" render={({ field }) => <InputMascara mascara="dinheiro" {...field} value={String(field.value ?? "")} />} />
              </Campo>
            )}
            {tipoPreco === "pelicula" && (
              <p className="self-end pb-2 text-sm text-muted-foreground sm:col-span-3">O preço vem da tabela de películas (linha × categoria).</p>
            )}
            {tipoPreco === "categoria" && (
              <div className="grid gap-3 sm:col-span-6 sm:grid-cols-5">
                {categorias.map((c) => (
                  <Campo key={c.id} rotulo={c.nome} nome={`preco-${c.id}`}>
                    <Controller
                      control={form.control}
                      name={`precos_categoria.${c.id}` as "precos_categoria"}
                      render={({ field }) => <InputMascara mascara="dinheiro" {...field} value={String(field.value ?? "")} />}
                    />
                  </Campo>
                ))}
              </div>
            )}
            {tipoPreco === "m2" && (
              <>
                <Campo rotulo="Película consumida (rolo)" nome="produto_consumo_id" ajuda="Baixa no estoque pela área." className="sm:col-span-4">
                  <NativeSelect {...form.register("produto_consumo_id")}>
                    <option value="">Sem baixa de estoque</option>
                    {rolos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </NativeSelect>
                </Campo>
                <Campo rotulo="Perda no corte (%)" nome="perda_percentual" erro={erros.perda_percentual?.message} className="sm:col-span-2">
                  <Input inputMode="decimal" {...form.register("perda_percentual")} />
                </Campo>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comissão do instalador</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-6">
            <Campo rotulo="Tipo" nome="comissao_tipo" className="sm:col-span-3">
              <NativeSelect {...form.register("comissao_tipo")}>
                <option value="nenhuma">Sem comissão</option>
                <option value="percentual">Percentual sobre o valor</option>
                <option value="fixo">Valor fixo por serviço</option>
              </NativeSelect>
            </Campo>
            {comissaoTipo === "percentual" && (
              <Campo rotulo="Percentual (%)" nome="comissao_percentual" erro={erros.comissao_percentual?.message} className="sm:col-span-3">
                <Input inputMode="decimal" {...form.register("comissao_percentual")} />
              </Campo>
            )}
            {comissaoTipo === "fixo" && (
              <Campo rotulo="Valor (R$)" nome="comissao_fixo_centavos" className="sm:col-span-3">
                <Controller control={form.control} name="comissao_fixo_centavos" render={({ field }) => <InputMascara mascara="dinheiro" {...field} value={String(field.value ?? "")} />} />
              </Campo>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados fiscais (NFS-e)</CardTitle>
            <CardDescription>Código do serviço da LC 116 / tributação nacional e alíquota de ISS.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-6">
            {!validado && (
              <Alert variant="warning" className="sm:col-span-6">
                <AlertTriangleIcon />
                <AlertDescription>Dados fiscais ainda não validados pelo contador.</AlertDescription>
              </Alert>
            )}
            <Campo rotulo="Código do serviço (LC 116)" nome="codigo_servico" ajuda="Ex.: 14.01.01" className="sm:col-span-2">
              <Input {...form.register("codigo_servico")} />
            </Campo>
            <Campo rotulo="Código municipal" nome="codigo_tributacao_municipal" className="sm:col-span-2">
              <Input {...form.register("codigo_tributacao_municipal")} />
            </Campo>
            <Campo rotulo="Alíquota ISS (%)" nome="aliquota_iss" className="sm:col-span-2">
              <Input inputMode="decimal" {...form.register("aliquota_iss")} />
            </Campo>
            <Campo rotulo="Código NBS" nome="codigo_nbs" className="sm:col-span-2">
              <Input {...form.register("codigo_nbs")} />
            </Campo>
            <Campo rotulo="CST IBS/CBS" nome="cst_ibs_cbs" erro={erros.cst_ibs_cbs?.message} className="sm:col-span-2">
              <Input inputMode="numeric" {...form.register("cst_ibs_cbs")} />
            </Campo>
            <Campo rotulo="cClassTrib" nome="cclass_trib" erro={erros.cclass_trib?.message} className="sm:col-span-2">
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
          {servico ? (
            <Confirmar titulo="Excluir este serviço?" destrutivo textoConfirmar="Excluir" aoConfirmar={() => exclusao.executar(() => excluirServico(servico.id))}>
              <Button type="button" variant="ghost" className="text-destructive">
                <Trash2Icon /> Excluir
              </Button>
            </Confirmar>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} Salvar serviço
          </Button>
        </div>
      )}
    </form>
  );
}
