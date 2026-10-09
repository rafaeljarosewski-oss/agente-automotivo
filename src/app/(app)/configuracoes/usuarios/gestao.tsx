"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyRoundIcon, Loader2Icon, PencilIcon, UserPlusIcon } from "lucide-react";

import { Campo } from "@/components/formulario/campo";
import { InputMascara } from "@/components/formulario/input-mascara";
import { useAcao } from "@/components/formulario/usar-acao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarTelefone } from "@/lib/dominio/contato";
import { ROTULO_PAPEL } from "@/lib/dominio/rotulos";
import type { PapelUsuario, Tabela } from "@/lib/supabase/tipos";
import { atualizarUsuario, criarUsuario, redefinirSenha } from "./actions";

type Perfil = Tabela<"perfis">;

function SeletorPapel(props: React.ComponentProps<typeof NativeSelect>) {
  return (
    <NativeSelect {...props}>
      {(Object.keys(ROTULO_PAPEL) as PapelUsuario[]).map((p) => (
        <option key={p} value={p}>
          {ROTULO_PAPEL[p]}
        </option>
      ))}
    </NativeSelect>
  );
}

function DialogoNovo({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const form = useForm({ defaultValues: { nome: "", email: "", telefone: "", papel: "atendente" as PapelUsuario, senha: "" } });
  const { pendente, executar } = useAcao();
  const erros = form.formState.errors;
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((v) =>
            executar(() => criarUsuario(v), {
              form,
              aoConcluir: () => {
                form.reset();
                fechar();
              },
            }),
          )}
        >
          <Campo rotulo="Nome" nome="nome" erro={erros.nome?.message} obrigatorio>
            <Input {...form.register("nome")} />
          </Campo>
          <Campo rotulo="E-mail (login)" nome="email" erro={erros.email?.message} obrigatorio>
            <Input type="email" autoComplete="off" {...form.register("email")} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Perfil" nome="papel">
              <SeletorPapel {...form.register("papel")} />
            </Campo>
            <Campo rotulo="Telefone" nome="telefone" erro={erros.telefone?.message}>
              <Controller control={form.control} name="telefone" render={({ field }) => <InputMascara mascara="telefone" {...field} />} />
            </Campo>
          </div>
          <Campo rotulo="Senha inicial" nome="senha" erro={erros.senha?.message} ajuda="Mínimo de 8 caracteres." obrigatorio>
            <Input type="text" autoComplete="new-password" {...form.register("senha")} />
          </Campo>
          <DialogFooter>
            <Button type="submit" disabled={pendente}>
              {pendente && <Loader2Icon className="animate-spin" />} Criar usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DialogoEditar({ usuario, fechar }: { usuario: Perfil; fechar: () => void }) {
  const form = useForm({
    defaultValues: { id: usuario.id, nome: usuario.nome, telefone: formatarTelefone(usuario.telefone), papel: usuario.papel, ativo: usuario.ativo },
  });
  const [novaSenha, setNovaSenha] = useState("");
  const { pendente, executar } = useAcao();
  const senhaAcao = useAcao();
  return (
    <Dialog open onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {usuario.nome}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={form.handleSubmit((v) => executar(() => atualizarUsuario(v), { form, aoConcluir: fechar }))}>
          <Campo rotulo="Nome" nome="nome">
            <Input {...form.register("nome")} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Perfil" nome="papel-edicao">
              <SeletorPapel {...form.register("papel")} />
            </Campo>
            <Campo rotulo="Telefone" nome="telefone-edicao">
              <Controller control={form.control} name="telefone" render={({ field }) => <InputMascara mascara="telefone" {...field} />} />
            </Campo>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Controller control={form.control} name="ativo" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
            Acesso ativo
          </label>
          <DialogFooter>
            <Button type="submit" disabled={pendente}>
              {pendente && <Loader2Icon className="animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </form>
        <div className="grid gap-2 border-t pt-4">
          <p className="text-sm font-medium">Redefinir senha</p>
          <div className="flex gap-2">
            <Input placeholder="Nova senha (mín. 8)" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
            <Button
              type="button"
              variant="outline"
              disabled={senhaAcao.pendente || novaSenha.length < 8}
              onClick={() => senhaAcao.executar(() => redefinirSenha({ id: usuario.id, senha: novaSenha }), { aoConcluir: () => setNovaSenha("") })}
            >
              <KeyRoundIcon /> Redefinir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GestaoUsuarios({ usuarios, usuarioAtual }: { usuarios: Perfil[]; usuarioAtual: string }) {
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<Perfil | null>(null);
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setNovo(true)}>
          <UserPlusIcon /> Novo usuário
        </Button>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.nome} {u.id === usuarioAtual && <span className="text-xs text-muted-foreground">(você)</span>}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{ROTULO_PAPEL[u.papel]}</TableCell>
                <TableCell>{u.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="muted">Inativo</Badge>}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditando(u)} aria-label={`Editar ${u.nome}`}>
                    <PencilIcon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DialogoNovo aberto={novo} fechar={() => setNovo(false)} />
      {editando && <DialogoEditar usuario={editando} fechar={() => setEditando(null)} />}
    </div>
  );
}
