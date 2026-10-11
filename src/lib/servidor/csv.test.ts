import { describe, expect, it } from "vitest";

import { centavosCSV, gerarCSV } from "./csv";

describe("CSV", () => {
  it("usa ponto e vírgula, BOM e escapa aspas e quebras", () => {
    const csv = gerarCSV(
      [
        { titulo: "Nome", valor: (l: { nome: string; v: number }) => l.nome },
        { titulo: "Valor", valor: (l) => centavosCSV(l.v) },
      ],
      [
        { nome: 'Película "G5"', v: 123456 },
        { nome: "Linha;dupla", v: 5 },
        { nome: "=HYPERLINK()", v: -100 },
      ],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Película ""G5""";1234,56');
    expect(csv).toContain('"Linha;dupla";0,05');
    expect(csv).toContain("'=HYPERLINK();-1,00");
  });
});
