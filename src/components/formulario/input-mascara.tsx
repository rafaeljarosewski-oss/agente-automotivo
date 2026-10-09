"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { aplicarMascara, inputModeMascara, type Mascara } from "./mascaras";

type Props = Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & {
  mascara: Mascara;
  value?: string | null;
  onChange?: (valor: string) => void;
  onValorChange?: (valor: string) => void;
};

/** Campo de texto com máscara brasileira (telefone, CPF/CNPJ, CEP, placa, dinheiro) */
export const InputMascara = React.forwardRef<HTMLInputElement, Props>(function InputMascara(
  { mascara, value, onChange, onValorChange, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      inputMode={inputModeMascara[mascara]}
      autoComplete="off"
      value={value ?? ""}
      onChange={(e) => {
        const v = aplicarMascara(mascara, e.target.value);
        onChange?.(v);
        onValorChange?.(v);
      }}
      {...(mascara === "placa" ? { style: { textTransform: "uppercase" } } : {})}
      {...props}
    />
  );
});
