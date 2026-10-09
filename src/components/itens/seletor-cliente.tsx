"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2Icon, SearchIcon, UserPlusIcon, XIcon } from "lucide-react";

import {
  criarClienteRapido,
  listarVeiculosCliente,
  pesquisarClientes,
  type ClienteResumo,
  type VeiculoResumo,
} from "@/app/(app)/acoes-comuns";
import { Campo } from "@/components/formulario/campo";
import { InputMascara } from "@/components/formulario/input-mascara";
import { useAcao } from "@/components/formulario/usar-acao";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { formatarTelefone } from "@/lib/dominio/contato";
import { formatarCpfCnpj } from "@/lib/dominio/documentos";
import { formatarPlaca } from "@/lib/dominio/placa";

function CadastroRapido({
  categorias,
  nomeInicial,
  fechar,
  aoCriar,
}: {
  categorias: { id: string; nome: string }[];
  nomeInicial: string;
  fechar: () => void;
  aoCriar: (cliente: ClienteResumo, veiculo: VeiculoResumo | null) => void;
}) {
  const [d, setD] = useState({ nome: nomeInicial, whatsapp: "", placa: "", marca: "", modelo: "", categoria_id: categorias[0]?.id ?? "" });
  const { pendente, executar } = useAcao();
  return (
    <Dialog open onOpenChange={(a) => !a && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastro rápido de cliente</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            executar(() => criarClienteRapido(d), { aoConcluir: (r) => aoCriar(r.cliente, r.veiculo) });
          }}
        >
          <Campo rotulo="Nome" nome="rapido-nome" obrigatorio className="sm:col-span-2">
            <Input value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} />
          </Campo>
          <Campo rotulo="WhatsApp" nome="rapido-whatsapp" className="sm:col-span-2">
            <InputMascara mascara="telefone" value={d.whatsapp} onChange={(v) => setD({ ...d, whatsapp: v })} />
          </Campo>
          <Campo rotulo="Placa" nome="rapido-placa">
            <InputMascara mascara="placa" value={d.placa} onChange={(v) => setD({ ...d, placa: v })} />
          </Campo>
          <Campo rotulo="Categoria" nome="rapido-categoria">
            <NativeSelect value={d.categoria_id} onChange={(e) => setD({ ...d, categoria_id: e.target.value })}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </NativeSelect>
          </Campo>
          <Campo rotulo="Marca" nome="rapido-marca">
            <Input value={d.marca} onChange={(e) => setD({ ...d, marca: e.target.value })} />
          </Campo>
          <Campo rotulo="Modelo" nome="rapido-modelo">
            <Input value={d.modelo} onChange={(e) => setD({ ...d, modelo: e.target.value })} />
          </Campo>
          <p className="text-xs text-muted-foreground sm:col-span-2">Você pode completar CPF e endereço depois, no cadastro do cliente.</p>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={pendente || !d.nome.trim()}>
              {pendente && <Loader2Icon className="animate-spin" />} Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Escolha do cliente (busca por nome, telefone, CPF/CNPJ ou placa) e do veículo */
export function SeletorClienteVeiculo({
  cliente,
  veiculoId,
  categorias,
  aoMudarCliente,
  aoMudarVeiculo,
  veiculoOpcional = true,
}: {
  cliente: ClienteResumo | null;
  veiculoId: string | null;
  categorias: { id: string; nome: string }[];
  aoMudarCliente: (c: ClienteResumo | null) => void;
  aoMudarVeiculo: (v: VeiculoResumo | null) => void;
  veiculoOpcional?: boolean;
}) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ClienteResumo[]>([]);
  const [veiculos, setVeiculos] = useState<VeiculoResumo[]>([]);
  const [buscando, iniciar] = useTransition();
  const [cadastrando, setCadastrando] = useState(false);

  useEffect(() => {
    if (cliente || termo.trim().length < 2) return;
    const t = setTimeout(() => {
      iniciar(async () => {
        const r = await pesquisarClientes(termo);
        setResultados(r.ok ? r.dados : []);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [termo, cliente]);

  useEffect(() => {
    if (!cliente) return;
    let ativo = true;
    listarVeiculosCliente(cliente.id).then((r) => {
      if (!ativo || !r.ok) return;
      setVeiculos(r.dados);
      if (!veiculoId && r.dados.length === 1) aoMudarVeiculo(r.dados[0]!);
      else if (veiculoId) aoMudarVeiculo(r.dados.find((v) => v.id === veiculoId) ?? null);
    });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente?.id]);

  if (!cliente) {
    return (
      <div className="grid gap-2">
        <div className="relative">
          {buscando ? (
            <Loader2Icon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            id="busca-cliente"
            className="pl-9"
            placeholder="Buscar cliente por nome, telefone, CPF/CNPJ ou placa"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            autoComplete="off"
          />
        </div>
        {termo.trim().length >= 2 && (
          <ul className="divide-y rounded-md border" role="listbox" aria-label="Clientes encontrados">
            {resultados.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    aoMudarCliente(c);
                    setTermo("");
                    setResultados([]);
                  }}
                >
                  <span className="font-medium">{c.nome}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[formatarCpfCnpj(c.cpf_cnpj), formatarTelefone(c.whatsapp ?? c.telefone), c.placas?.split(", ").map(formatarPlaca).join(", ")].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
            {!buscando && resultados.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</li>}
          </ul>
        )}
        <Button type="button" variant="outline" className="w-fit" onClick={() => setCadastrando(true)}>
          <UserPlusIcon /> Cadastrar cliente novo
        </Button>
        {cadastrando && (
          <CadastroRapido
            categorias={categorias}
            nomeInicial={/\d/.test(termo) ? "" : termo}
            fechar={() => setCadastrando(false)}
            aoCriar={(c, v) => {
              setCadastrando(false);
              aoMudarCliente(c);
              if (v) {
                setVeiculos([v]);
                aoMudarVeiculo(v);
              }
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate font-medium" data-testid="cliente-selecionado">
            {cliente.nome}
          </div>
          <div className="text-xs text-muted-foreground">{formatarTelefone(cliente.whatsapp ?? cliente.telefone)}</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Trocar cliente"
          onClick={() => {
            aoMudarCliente(null);
            aoMudarVeiculo(null);
            setVeiculos([]);
          }}
        >
          <XIcon />
        </Button>
      </div>
      <NativeSelect
        aria-label="Veículo"
        id="veiculo"
        value={veiculoId ?? ""}
        onChange={(e) => aoMudarVeiculo(veiculos.find((v) => v.id === e.target.value) ?? null)}
      >
        {(veiculoOpcional || veiculos.length === 0) && <option value="">{veiculos.length ? "Sem veículo (ex.: película residencial)" : "Cliente sem veículo cadastrado"}</option>}
        {veiculos.map((v) => (
          <option key={v.id} value={v.id}>
            {formatarPlaca(v.placa)} · {[v.marca, v.modelo].filter(Boolean).join(" ")}
            {v.categoria_id ? ` · ${categorias.find((c) => c.id === v.categoria_id)?.nome ?? ""}` : ""}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
