"use client";

import Link from "next/link";
import { useState } from "react";
import { CarIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Confirmar } from "@/components/comum/confirmar";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatarCEP } from "@/lib/dominio/contato";
import { formatarPlaca } from "@/lib/dominio/placa";
import type { Tabela } from "@/lib/supabase/tipos";
import { excluirCliente, excluirVeiculo } from "../actions";
import { DialogoVeiculo } from "../dialogo-veiculo";
import { FormularioCliente } from "../formulario-cliente";

export function VeiculosCliente({
  clienteId,
  veiculos,
  categorias,
}: {
  clienteId: string;
  veiculos: Tabela<"veiculos">[];
  categorias: { id: string; nome: string }[];
}) {
  const [editando, setEditando] = useState<Tabela<"veiculos"> | null>(null);
  const [novo, setNovo] = useState(false);
  const { executar } = useAcao();
  const nomeCategoria = (id: string | null) => categorias.find((c) => c.id === id)?.nome;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Veículos</CardTitle>
        <CardAction>
          <Button size="sm" variant="outline" onClick={() => setNovo(true)}>
            <PlusIcon /> Adicionar
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {veiculos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {veiculos.map((v) => (
              <li key={v.id} className="flex items-start gap-3 rounded-lg border p-3">
                <CarIcon className="mt-0.5 size-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <Link href={`/veiculos/${v.id}`} className="font-medium hover:underline">
                    <span className="font-mono">{formatarPlaca(v.placa)}</span> · {[v.marca, v.modelo].filter(Boolean).join(" ")}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {[nomeCategoria(v.categoria_id), v.ano_modelo, v.cor].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setEditando(v)} aria-label="Editar veículo">
                  <PencilIcon />
                </Button>
                <Confirmar titulo={`Excluir o veículo ${formatarPlaca(v.placa)}?`} destrutivo textoConfirmar="Excluir" aoConfirmar={() => executar(() => excluirVeiculo(v.id))}>
                  <Button variant="ghost" size="icon-sm" aria-label="Excluir veículo">
                    <Trash2Icon />
                  </Button>
                </Confirmar>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <DialogoVeiculo clienteId={clienteId} categorias={categorias} aberto={novo} fechar={() => setNovo(false)} />
      {editando && <DialogoVeiculo clienteId={clienteId} veiculo={editando} categorias={categorias} aberto fechar={() => setEditando(null)} />}
    </Card>
  );
}

export function AcoesCliente({ cliente }: { cliente: Tabela<"clientes"> }) {
  const [editando, setEditando] = useState(false);
  const { executar } = useAcao();
  const endereco = [cliente.logradouro, cliente.numero, cliente.complemento].filter(Boolean).join(", ");
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Dados</CardTitle>
        <CardAction>
          <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
            <PencilIcon /> Editar
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {cliente.email && <p>{cliente.email}</p>}
        {endereco && (
          <p>
            {endereco}
            <br />
            {[cliente.bairro, cliente.cidade, cliente.uf].filter(Boolean).join(" · ")} {formatarCEP(cliente.cep)}
          </p>
        )}
        {cliente.observacoes && <p className="whitespace-pre-line text-muted-foreground">{cliente.observacoes}</p>}
        <Confirmar
          titulo="Excluir este cliente?"
          descricao="O cliente e seus veículos deixam de aparecer nas buscas. O histórico de OS e notas é mantido."
          destrutivo
          textoConfirmar="Excluir"
          aoConfirmar={() => executar(() => excluirCliente(cliente.id))}
        >
          <Button variant="ghost" size="sm" className="mt-2 w-fit text-destructive">
            <Trash2Icon /> Excluir cliente
          </Button>
        </Confirmar>
      </CardContent>
      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <FormularioCliente cliente={cliente} aoSalvar={() => setEditando(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
