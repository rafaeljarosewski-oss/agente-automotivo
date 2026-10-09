"use client";

import { useRef, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageUpIcon, Loader2Icon, SaveIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { buscarCNPJ } from "@/app/(app)/acoes-comuns";
import { Campo } from "@/components/formulario/campo";
import { CamposEndereco } from "@/components/formulario/endereco";
import { InputMascara } from "@/components/formulario/input-mascara";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { formatarCEP, formatarTelefone } from "@/lib/dominio/contato";
import { formatarCNPJ } from "@/lib/dominio/documentos";
import { ROTULO_REGIME } from "@/lib/dominio/rotulos";
import type { Tabela } from "@/lib/supabase/tipos";
import { schemaEmpresa, type EmpresaEntrada } from "@/lib/validacao/empresa";
import { enviarLogo, salvarEmpresa } from "./actions";

export function FormularioEmpresa({ empresa }: { empresa: Tabela<"empresas"> }) {
  const form = useForm<EmpresaEntrada>({
    resolver: zodResolver(schemaEmpresa) as never,
    defaultValues: {
      ...empresa,
      cnpj: formatarCNPJ(empresa.cnpj),
      telefone: formatarTelefone(empresa.telefone),
      whatsapp: formatarTelefone(empresa.whatsapp),
      cep: formatarCEP(empresa.cep),
    },
  });
  const { pendente, executar } = useAcao();
  const [consultando, iniciar] = useTransition();
  const erros = form.formState.errors;

  function consultarCnpj() {
    iniciar(async () => {
      const r = await buscarCNPJ(form.getValues("cnpj"));
      if (!r.ok) {
        toast.info(r.erro);
        return;
      }
      const d = r.dados;
      form.setValue("razao_social", d.razao_social, { shouldDirty: true });
      if (d.nome_fantasia) form.setValue("nome_fantasia", d.nome_fantasia, { shouldDirty: true });
      if (d.email) form.setValue("email", d.email, { shouldDirty: true });
      if (d.telefone) form.setValue("telefone", formatarTelefone(d.telefone), { shouldDirty: true });
      if (d.cnae) form.setValue("cnae", d.cnae, { shouldDirty: true });
      if (d.mei) form.setValue("regime_tributario", "mei");
      else if (d.simples) form.setValue("regime_tributario", "simples_nacional");
      form.setValue("cep", formatarCEP(d.endereco.cep));
      form.setValue("logradouro", d.endereco.logradouro);
      form.setValue("numero", d.endereco.numero);
      form.setValue("complemento", d.endereco.complemento);
      form.setValue("bairro", d.endereco.bairro);
      form.setValue("cidade", d.endereco.cidade);
      form.setValue("uf", d.endereco.uf);
      if (d.endereco.codigo_municipio) form.setValue("codigo_municipio", d.endereco.codigo_municipio);
      toast.success("Dados preenchidos pela Receita Federal. Confira antes de salvar.");
    });
  }

  return (
    <Card>
      <CardContent>
        <form className="grid gap-6" onSubmit={form.handleSubmit(() => executar(() => salvarEmpresa(form.getValues()), { form }))}>
          <div className="grid gap-4 sm:grid-cols-6">
            <Campo rotulo="CNPJ" nome="cnpj" erro={erros.cnpj?.message} obrigatorio className="sm:col-span-3">
              <Controller
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <div className="flex gap-2">
                    <InputMascara mascara="cnpj" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                    <Button type="button" variant="outline" onClick={consultarCnpj} disabled={consultando} title="Buscar dados na Receita">
                      {consultando ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
                      <span className="hidden sm:inline">Buscar</span>
                    </Button>
                  </div>
                )}
              />
            </Campo>
            <Campo rotulo="Regime tributário" nome="regime_tributario" className="sm:col-span-3">
              <NativeSelect {...form.register("regime_tributario")}>
                {Object.entries(ROTULO_REGIME).map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </NativeSelect>
            </Campo>
            <Campo rotulo="Razão social" nome="razao_social" erro={erros.razao_social?.message} obrigatorio className="sm:col-span-4">
              <Input {...form.register("razao_social")} />
            </Campo>
            <Campo rotulo="Nome fantasia" nome="nome_fantasia" className="sm:col-span-2">
              <Input {...form.register("nome_fantasia")} />
            </Campo>
            <Campo rotulo="Inscrição estadual" nome="inscricao_estadual" className="sm:col-span-2">
              <Input {...form.register("inscricao_estadual")} />
            </Campo>
            <Campo rotulo="Inscrição municipal" nome="inscricao_municipal" className="sm:col-span-2">
              <Input {...form.register("inscricao_municipal")} />
            </Campo>
            <Campo rotulo="CNAE principal" nome="cnae" className="sm:col-span-2">
              <Input {...form.register("cnae")} />
            </Campo>
            <Campo rotulo="E-mail" nome="email" erro={erros.email?.message} className="sm:col-span-2">
              <Input type="email" {...form.register("email")} />
            </Campo>
            <Campo rotulo="Telefone" nome="telefone" erro={erros.telefone?.message} className="sm:col-span-2">
              <Controller control={form.control} name="telefone" render={({ field }) => <InputMascara mascara="telefone" {...field} />} />
            </Campo>
            <Campo rotulo="WhatsApp" nome="whatsapp" erro={erros.whatsapp?.message} className="sm:col-span-2">
              <Controller control={form.control} name="whatsapp" render={({ field }) => <InputMascara mascara="telefone" {...field} />} />
            </Campo>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Endereço</h2>
            <CamposEndereco form={form} mostrarIbge />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pendente}>
              {pendente ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} Salvar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function FormularioLogo({ urlLogo }: { urlLogo: string | null }) {
  const ref = useRef<HTMLFormElement>(null);
  const { pendente, executar } = useAcao();
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Logotipo</CardTitle>
        <CardDescription>Aparece nos orçamentos, OS e links enviados ao cliente.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex h-32 items-center justify-center rounded-md border bg-muted/40">
          {urlLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlLogo} alt="Logotipo da empresa" className="max-h-28 max-w-full object-contain" />
          ) : (
            <span className="text-sm text-muted-foreground">Sem logotipo</span>
          )}
        </div>
        <form
          ref={ref}
          onSubmit={(e) => {
            e.preventDefault();
            const dados = new FormData(e.currentTarget);
            executar(() => enviarLogo(dados), { aoConcluir: () => ref.current?.reset() });
          }}
          className="grid gap-2"
        >
          <Input type="file" name="logo" accept="image/png,image/jpeg" required />
          <Button type="submit" variant="outline" disabled={pendente}>
            {pendente ? <Loader2Icon className="animate-spin" /> : <ImageUpIcon />} Enviar logotipo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
