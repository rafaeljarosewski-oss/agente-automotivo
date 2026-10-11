"use client";

import { useState } from "react";

import { formatarData } from "@/lib/dominio/datas";
import { formatarMoeda } from "@/lib/dominio/dinheiro";

/** Colunas simples (uma série), com dica ao passar o mouse/tocar. A tabela abaixo traz os mesmos dados. */
export function GraficoFaturamento({ dias }: { dias: { dia: string; valor: number; os: number }[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const max = Math.max(1, ...dias.map((d) => d.valor));
  const sel = ativo !== null ? dias[ativo] : null;
  return (
    <div className="grid gap-2">
      <div className="h-6 text-sm text-muted-foreground" aria-live="polite">
        {sel ? (
          <span>
            <strong className="text-foreground">{formatarData(sel.dia)}</strong> · {formatarMoeda(sel.valor)} · {sel.os} OS
          </span>
        ) : (
          "Passe o mouse ou toque nas colunas para ver os valores."
        )}
      </div>
      <div className="flex h-48 items-end gap-[2px] border-b border-border" role="img" aria-label="Faturamento diário no período">
        {dias.map((d, i) => (
          <button
            key={d.dia}
            type="button"
            className="group flex h-full min-w-0 flex-1 items-end"
            onMouseEnter={() => setAtivo(i)}
            onMouseLeave={() => setAtivo(null)}
            onFocus={() => setAtivo(i)}
            onClick={() => setAtivo(i)}
            aria-label={`${formatarData(d.dia)}: ${formatarMoeda(d.valor)}`}
          >
            <span
              className="w-full rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
              style={{ height: d.valor ? `${Math.max(2, (d.valor / max) * 100)}%` : 0, opacity: ativo !== null && ativo !== i ? 0.55 : 1 }}
            />
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatarData(dias[0]?.dia)}</span>
        <span>{formatarData(dias.at(-1)?.dia)}</span>
      </div>
    </div>
  );
}
