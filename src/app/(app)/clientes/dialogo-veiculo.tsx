"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";

import { Campo } from "@/components/formulario/campo";
import { InputMascara } from "@/components/formulario/input-mascara";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { formatarPlaca } from "@/lib/dominio/placa";
import type { Tabela } from "@/lib/supabase/tipos";
import { schemaVeiculo, type VeiculoEntrada } from "@/lib/validacao/cliente";
import { salvarVeiculo } from "./actions";

export function DialogoVeiculo({
  clienteId,
  veiculo,
  categorias,
  aberto,
  fechar,
  aoSalvar,
}: {
  clienteId: string;
  veiculo?: Tabela<"veiculos"> | null;
  categorias: { id: string; nome: string }[];
  aberto: boolean;
  fechar: () => void;
  aoSalvar?: (id: string) => void;
}) {
  const form = useForm<VeiculoEntrada>({
    resolver: zodResolver(schemaVeiculo) as never,
    values: veiculo
      ? {
          ...veiculo,
          placa: formatarPlaca(veiculo.placa),
          ano_fabricacao: veiculo.ano_fabricacao ?? "",
          ano_modelo: veiculo.ano_modelo ?? "",
        }
      : { cliente_id: clienteId, placa: "", modelo: "", marca: "", cor: "", categoria_id: categorias[0]?.id ?? "", ano_fabricacao: "", ano_modelo: "" },
  });
  const { pendente, executar } = useAcao();
  const erros = form.formState.errors;
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{veiculo ? "Editar veículo" : "Novo veículo"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit(() =>
            executar(() => salvarVeiculo(form.getValues()), {
              form,
              aoConcluir: (v) => {
                fechar();
                aoSalvar?.(v.id);
              },
            }),
          )}
        >
          <Campo rotulo="Placa" nome="placa" erro={erros.placa?.message} obrigatorio>
            <Controller control={form.control} name="placa" render={({ field }) => <InputMascara mascara="placa" placeholder="ABC1D23" {...field} />} />
          </Campo>
          <Campo rotulo="Categoria" nome="categoria_id" ajuda="Define o preço dos serviços.">
            <NativeSelect {...form.register("categoria_id")}>
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </NativeSelect>
          </Campo>
          <Campo rotulo="Marca" nome="marca">
            <Input {...form.register("marca")} placeholder="Ex.: Volkswagen" />
          </Campo>
          <Campo rotulo="Modelo" nome="modelo" erro={erros.modelo?.message} obrigatorio>
            <Input {...form.register("modelo")} placeholder="Ex.: Polo Highline" />
          </Campo>
          <Campo rotulo="Ano fabricação" nome="ano_fabricacao" erro={erros.ano_fabricacao?.message}>
            <Input inputMode="numeric" maxLength={4} {...form.register("ano_fabricacao")} />
          </Campo>
          <Campo rotulo="Ano modelo" nome="ano_modelo" erro={erros.ano_modelo?.message}>
            <Input inputMode="numeric" maxLength={4} {...form.register("ano_modelo")} />
          </Campo>
          <Campo rotulo="Cor" nome="cor">
            <Input {...form.register("cor")} />
          </Campo>
          <Campo rotulo="Chassi" nome="chassi">
            <Input {...form.register("chassi")} className="uppercase" />
          </Campo>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={pendente}>
              {pendente && <Loader2Icon className="animate-spin" />} Salvar veículo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
