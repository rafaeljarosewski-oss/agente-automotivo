"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CampoProps {
  rotulo: string;
  nome?: string;
  erro?: string;
  ajuda?: React.ReactNode;
  obrigatorio?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Id e atributos de acessibilidade do campo atual. Usado por campos que ficam dentro de um
 * <Controller> (que não repassa props), como o InputMascara.
 */
export const CampoContexto = React.createContext<{ id: string; "aria-invalid"?: boolean; "aria-describedby"?: string } | null>(null);

/** Rótulo + campo + mensagem de erro, com acessibilidade (aria-describedby) */
export function Campo({ rotulo, nome, erro, ajuda, obrigatorio, className, children }: CampoProps) {
  const id = nome ?? rotulo.toLowerCase().replace(/\s+/g, "-");
  const acessibilidade = { id, "aria-invalid": erro ? true : undefined, "aria-describedby": erro ? `${id}-erro` : undefined };
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>
        {rotulo}
        {obrigatorio && <span className="text-destructive">*</span>}
      </Label>
      <CampoContexto.Provider value={acessibilidade}>
        {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, acessibilidade) : children}
      </CampoContexto.Provider>
      {ajuda && !erro && <p className="text-xs text-muted-foreground">{ajuda}</p>}
      {erro && (
        <p id={`${id}-erro`} className="text-xs font-medium text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
