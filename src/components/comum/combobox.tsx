"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronsUpDownIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizarBusca } from "@/lib/dominio/texto";
import { cn } from "@/lib/utils";

export interface OpcaoCombo {
  valor: string;
  rotulo: string;
  detalhe?: string;
  grupo?: string;
  busca?: string;
}

/** Seleção com busca (funciona bem no celular). Filtra no navegador. */
export function Combobox({
  opcoes,
  aoSelecionar,
  placeholder = "Selecione...",
  textoBotao,
  className,
  vazio = "Nada encontrado.",
  id,
}: {
  opcoes: OpcaoCombo[];
  aoSelecionar: (valor: string) => void;
  placeholder?: string;
  textoBotao?: React.ReactNode;
  className?: string;
  vazio?: string;
  id?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [destaque, setDestaque] = useState(0);
  const lista = useRef<HTMLUListElement>(null);
  const selecionou = useRef(false);

  const filtradas = useMemo(() => {
    const t = normalizarBusca(termo);
    const palavras = t.split(/\s+/).filter(Boolean);
    return opcoes
      .filter((o) => {
        const alvo = normalizarBusca(`${o.rotulo} ${o.detalhe ?? ""} ${o.busca ?? ""} ${o.grupo ?? ""}`);
        return palavras.every((p) => alvo.includes(p));
      })
      .slice(0, 60);
  }, [opcoes, termo]);

  function escolher(o: OpcaoCombo | undefined) {
    if (!o) return;
    selecionou.current = true;
    setAberto(false);
    setTermo("");
    // Seleciona depois de fechar, para não disputar o foco com um diálogo aberto pela seleção
    setTimeout(() => aoSelecionar(o.valor), 0);
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" className={cn("w-full justify-between font-normal", className)}>
          <span className="truncate">{textoBotao ?? placeholder}</span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(32rem,calc(100vw-2rem))] p-0"
        onCloseAutoFocus={(e) => {
          if (selecionou.current) {
            e.preventDefault();
            selecionou.current = false;
          }
        }}
      >
        <div className="relative border-b p-2">
          <SearchIcon className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={termo}
            placeholder={placeholder}
            className="border-0 pl-8 shadow-none focus-visible:ring-0"
            onChange={(e) => {
              setTermo(e.target.value);
              setDestaque(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setDestaque((d) => Math.min(d + 1, filtradas.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setDestaque((d) => Math.max(d - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                escolher(filtradas[destaque]);
              }
            }}
          />
        </div>
        <ul ref={lista} role="listbox" className="max-h-72 overflow-y-auto p-1">
          {filtradas.length === 0 && <li className="p-3 text-center text-sm text-muted-foreground">{vazio}</li>}
          {filtradas.map((o, i) => (
            <li key={o.valor}>
              {o.grupo && o.grupo !== filtradas[i - 1]?.grupo && (
                <div className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{o.grupo}</div>
              )}
              <button
                type="button"
                role="option"
                aria-selected={i === destaque}
                onMouseEnter={() => setDestaque(i)}
                onClick={() => escolher(o)}
                className={cn("flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm", i === destaque && "bg-accent")}
              >
                <span>{o.rotulo}</span>
                {o.detalhe && <span className="text-xs text-muted-foreground">{o.detalhe}</span>}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
