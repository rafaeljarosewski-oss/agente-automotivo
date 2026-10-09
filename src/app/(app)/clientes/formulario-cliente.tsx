"use client";

import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, SaveIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { buscarCNPJ } from "@/app/(app)/acoes-comuns";
import { Campo } from "@/components/formulario/campo";
import { CamposEndereco } from "@/components/formulario/endereco";
import { InputMascara } from "@/components/formulario/input-mascara";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatarCEP, formatarTelefone } from "@/lib/dominio/contato";
import { formatarCpfCnpj } from "@/lib/dominio/documentos";
import type { Tabela } from "@/lib/supabase/tipos";
import { cn } from "@/lib/utils";
import { schemaCliente, type ClienteEntrada } from "@/lib/validacao/cliente";
import { salvarCliente } from "./actions";

export function FormularioCliente({ cliente, aoSalvar }: { cliente?: Tabela<"clientes">; aoSalvar?: () => void }) {
  const form = useForm<ClienteEntrada>({
    resolver: zodResolver(schemaCliente) as never,
    defaultValues: cliente
      ? {
          ...cliente,
          cpf_cnpj: formatarCpfCnpj(cliente.cpf_cnpj),
          telefone: formatarTelefone(cliente.telefone),
          whatsapp: formatarTelefone(cliente.whatsapp),
          cep: formatarCEP(cliente.cep),
        }
      : { tipo_pessoa: "PF", nome: "", aceita_mensagens: true, uf: "RS" },
  });
  const tipo = useWatch({ control: form.control, name: "tipo_pessoa" });
  const { pendente, executar } = useAcao();
  const [consultando, iniciar] = useTransition();
  const erros = form.formState.errors;

  function consultarCnpj() {
    iniciar(async () => {
      const r = await buscarCNPJ(form.getValues("cpf_cnpj") ?? "");
      if (!r.ok) return void toast.info(r.erro);
      const d = r.dados;
      form.setValue("nome", d.razao_social);
      if (d.nome_fantasia) form.setValue("nome_fantasia", d.nome_fantasia);
      if (d.email) form.setValue("email", d.email);
      if (d.telefone) form.setValue("telefone", formatarTelefone(d.telefone));
      form.setValue("cep", formatarCEP(d.endereco.cep));
      form.setValue("logradouro", d.endereco.logradouro);
      form.setValue("numero", d.endereco.numero);
      form.setValue("complemento", d.endereco.complemento);
      form.setValue("bairro", d.endereco.bairro);
      form.setValue("cidade", d.endereco.cidade);
      form.setValue("uf", d.endereco.uf);
      if (d.endereco.codigo_municipio) form.setValue("codigo_municipio", d.endereco.codigo_municipio);
      toast.success("Dados preenchidos pela Receita Federal.");
    });
  }

  return (
    <form
      className="grid gap-6"
      onSubmit={form.handleSubmit(() =>
        executar(() => salvarCliente(form.getValues(), { redirecionar: !cliente }), { form, aoConcluir: () => aoSalvar?.() }),
      )}
    >
      <div className="inline-flex w-fit rounded-lg bg-muted p-1" role="radiogroup" aria-label="Tipo de pessoa">
        {(["PF", "PJ"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            onClick={() => form.setValue("tipo_pessoa", t)}
            className={cn("rounded-md px-4 py-1.5 text-sm font-medium", tipo === t ? "bg-background shadow-sm" : "text-muted-foreground")}
          >
            {t === "PF" ? "Pessoa física" : "Pessoa jurídica"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-6">
        <Campo rotulo={tipo === "PF" ? "Nome completo" : "Razão social"} nome="nome" erro={erros.nome?.message} obrigatorio className="sm:col-span-4">
          <Input {...form.register("nome")} autoComplete="off" />
        </Campo>
        <Campo rotulo={tipo === "PF" ? "CPF" : "CNPJ"} nome="cpf_cnpj" erro={erros.cpf_cnpj?.message} className="sm:col-span-2">
          <Controller
            control={form.control}
            name="cpf_cnpj"
            render={({ field }) =>
              tipo === "PJ" ? (
                <div className="flex gap-2">
                  <InputMascara mascara="cnpj" {...field} />
                  <Button type="button" variant="outline" size="icon" onClick={consultarCnpj} disabled={consultando} aria-label="Buscar CNPJ">
                    {consultando ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
                  </Button>
                </div>
              ) : (
                <InputMascara mascara="cpf" {...field} />
              )
            }
          />
        </Campo>
        {tipo === "PJ" && (
          <>
            <Campo rotulo="Nome fantasia" nome="nome_fantasia" className="sm:col-span-4">
              <Input {...form.register("nome_fantasia")} />
            </Campo>
            <Campo rotulo="Inscrição estadual" nome="inscricao_estadual" ajuda="Necessária para NF-e de contribuinte." className="sm:col-span-2">
              <Input {...form.register("inscricao_estadual")} />
            </Campo>
          </>
        )}
        <Campo rotulo="WhatsApp" nome="whatsapp" erro={erros.whatsapp?.message} className="sm:col-span-2">
          <Controller control={form.control} name="whatsapp" render={({ field }) => <InputMascara mascara="telefone" placeholder="(51) 99999-9999" {...field} />} />
        </Campo>
        <Campo rotulo="Telefone" nome="telefone" erro={erros.telefone?.message} className="sm:col-span-2">
          <Controller control={form.control} name="telefone" render={({ field }) => <InputMascara mascara="telefone" {...field} />} />
        </Campo>
        <Campo rotulo="E-mail" nome="email" erro={erros.email?.message} className="sm:col-span-2">
          <Input type="email" {...form.register("email")} />
        </Campo>
        {tipo === "PF" && (
          <Campo rotulo="Data de nascimento" nome="data_nascimento" className="sm:col-span-2">
            <Input type="date" {...form.register("data_nascimento")} />
          </Campo>
        )}
        <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-4">
          <Controller
            control={form.control}
            name="aceita_mensagens"
            render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />}
          />
          Aceita receber mensagens (lembretes e promoções)
        </label>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Endereço</h2>
        <CamposEndereco form={form} />
      </div>

      <Campo rotulo="Observações" nome="observacoes">
        <Textarea rows={3} {...form.register("observacoes")} />
      </Campo>

      <div className="flex justify-end">
        <Button type="submit" disabled={pendente}>
          {pendente ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} {cliente ? "Salvar alterações" : "Cadastrar cliente"}
        </Button>
      </div>
    </form>
  );
}
