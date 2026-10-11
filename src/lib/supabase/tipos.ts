import type { Database } from "./database.types";

type Public = Database["public"];

export type Tabela<T extends keyof Public["Tables"]> = Public["Tables"][T]["Row"];
export type NovaLinha<T extends keyof Public["Tables"]> = Public["Tables"][T]["Insert"];
export type AtualizaLinha<T extends keyof Public["Tables"]> = Public["Tables"][T]["Update"];
export type Enum<T extends keyof Public["Enums"]> = Public["Enums"][T];

export type PapelUsuario = Enum<"papel_usuario">;
export type StatusOrcamento = Enum<"status_orcamento">;
export type StatusOS = Enum<"status_os">;
export type FormaPagamento = Enum<"forma_pagamento">;
export type TipoNota = Enum<"tipo_nota">;
export type StatusNota = Enum<"status_nota">;
