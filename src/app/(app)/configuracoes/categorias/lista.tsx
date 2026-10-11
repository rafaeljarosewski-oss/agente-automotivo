"use client";

import { useState } from "react";
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";

import { Confirmar } from "@/components/comum/confirmar";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Tabela } from "@/lib/supabase/tipos";
import { excluirCategoria, salvarCategoria } from "./actions";

function Linha({ categoria }: { categoria: Tabela<"categorias_veiculo"> }) {
  const [nome, setNome] = useState(categoria.nome);
  const [ordem, setOrdem] = useState(String(categoria.ordem));
  const [ativo, setAtivo] = useState(categoria.ativo);
  const { pendente, executar } = useAcao();
  const alterado = nome !== categoria.nome || ordem !== String(categoria.ordem) || ativo !== categoria.ativo;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b py-3 last:border-0">
      <Input className="w-16" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordem" />
      <Input className="min-w-40 flex-1" value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome" />
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={ativo} onCheckedChange={setAtivo} /> Ativa
      </label>
      <Button
        variant="outline"
        size="icon"
        disabled={!alterado || pendente}
        onClick={() => executar(() => salvarCategoria({ id: categoria.id, nome, ordem, ativo }))}
        aria-label="Salvar"
      >
        <SaveIcon />
      </Button>
      <Confirmar
        titulo={`Excluir "${categoria.nome}"?`}
        descricao="Veículos já cadastrados continuam com esta categoria no histórico."
        destrutivo
        textoConfirmar="Excluir"
        aoConfirmar={() => executar(() => excluirCategoria(categoria.id))}
      >
        <Button variant="ghost" size="icon" aria-label="Excluir">
          <Trash2Icon />
        </Button>
      </Confirmar>
    </div>
  );
}

export function ListaCategorias({ categorias }: { categorias: Tabela<"categorias_veiculo">[] }) {
  const [nova, setNova] = useState("");
  const { pendente, executar } = useAcao();
  return (
    <Card>
      <CardContent>
        {categorias.map((c) => (
          <Linha key={`${c.id}-${c.updated_at}`} categoria={c} />
        ))}
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            executar(() => salvarCategoria({ nome: nova, ordem: categorias.length + 1, ativo: true }), { aoConcluir: () => setNova("") });
          }}
        >
          <Input placeholder="Nova categoria (ex.: Moto, Van)" value={nova} onChange={(e) => setNova(e.target.value)} />
          <Button type="submit" disabled={!nova.trim() || pendente}>
            <PlusIcon /> Adicionar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
