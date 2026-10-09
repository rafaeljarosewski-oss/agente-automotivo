"use client";

import { useTransition } from "react";
import { Controller, type FieldValues, type Path, type PathValue, type UseFormReturn } from "react-hook-form";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { buscarCEP } from "@/app/(app)/acoes-comuns";
import { Input } from "@/components/ui/input";
import { somenteDigitos } from "@/lib/dominio/documentos";
import { Campo } from "./campo";
import { InputMascara } from "./input-mascara";

interface CamposEnderecoForm {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  codigo_municipio?: string | null;
}

/** Bloco de endereço com preenchimento automático pelo CEP */
export function CamposEndereco<F extends FieldValues & CamposEnderecoForm>({ form, mostrarIbge = false }: { form: UseFormReturn<F>; mostrarIbge?: boolean }) {
  const [buscando, iniciar] = useTransition();
  const erros = form.formState.errors as Record<string, { message?: string } | undefined>;
  const campo = (n: keyof CamposEnderecoForm) => n as unknown as Path<F>;

  function preencher(cep: string) {
    if (somenteDigitos(cep).length !== 8) return;
    iniciar(async () => {
      const r = await buscarCEP(cep);
      if (!r.ok) {
        toast.info(r.erro);
        return;
      }
      const set = (n: keyof CamposEnderecoForm, v: string | null) =>
        form.setValue(campo(n), (v ?? "") as PathValue<F, Path<F>>, { shouldDirty: true });
      set("logradouro", r.dados.logradouro);
      set("bairro", r.dados.bairro);
      set("cidade", r.dados.cidade);
      set("uf", r.dados.uf);
      if (r.dados.codigo_municipio) set("codigo_municipio", r.dados.codigo_municipio);
      if (r.dados.complemento && !form.getValues(campo("complemento"))) set("complemento", r.dados.complemento);
      form.setFocus(campo("numero"));
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <Campo rotulo="CEP" nome="cep" erro={erros.cep?.message} className="sm:col-span-2">
        <Controller
          control={form.control}
          name={campo("cep")}
          render={({ field }) => (
            <div className="relative">
              <InputMascara
                mascara="cep"
                value={field.value ?? ""}
                onChange={(v) => {
                  field.onChange(v);
                  if (somenteDigitos(v).length === 8) preencher(v);
                }}
                onBlur={field.onBlur}
                placeholder="00000-000"
              />
              {buscando && <Loader2Icon className="absolute top-2.5 right-2.5 size-4 animate-spin text-muted-foreground" />}
            </div>
          )}
        />
      </Campo>
      <Campo rotulo="Logradouro" nome="logradouro" erro={erros.logradouro?.message} className="sm:col-span-4">
        <Input {...form.register(campo("logradouro"))} />
      </Campo>
      <Campo rotulo="Número" nome="numero" erro={erros.numero?.message} className="sm:col-span-1">
        <Input {...form.register(campo("numero"))} />
      </Campo>
      <Campo rotulo="Complemento" nome="complemento" className="sm:col-span-2">
        <Input {...form.register(campo("complemento"))} />
      </Campo>
      <Campo rotulo="Bairro" nome="bairro" erro={erros.bairro?.message} className="sm:col-span-3">
        <Input {...form.register(campo("bairro"))} />
      </Campo>
      <Campo rotulo="Cidade" nome="cidade" erro={erros.cidade?.message} className={mostrarIbge ? "sm:col-span-3" : "sm:col-span-5"}>
        <Input {...form.register(campo("cidade"))} />
      </Campo>
      <Campo rotulo="UF" nome="uf" erro={erros.uf?.message} className="sm:col-span-1">
        <Input maxLength={2} className="uppercase" {...form.register(campo("uf"))} />
      </Campo>
      {mostrarIbge && (
        <Campo rotulo="Código IBGE" nome="codigo_municipio" erro={erros.codigo_municipio?.message} ajuda="Preenchido pelo CEP" className="sm:col-span-2">
          <Input inputMode="numeric" maxLength={7} {...form.register(campo("codigo_municipio"))} />
        </Campo>
      )}
    </div>
  );
}
