import { describe, expect, it } from "vitest";

import { assinarWebhook, verificarAssinatura } from "./assinatura";
import { traduzirRejeicao } from "./rejeicoes";

describe("tradução de rejeições", () => {
  it("traduz pelo código da SEFAZ", () => {
    expect(traduzirRejeicao([], "Rejeicao: Duplicidade de NF-e", "539")).toContain("já foi enviada");
    expect(traduzirRejeicao([], "Rejeicao: CNPJ do emitente difere do CNPJ do certificado", "213")).toContain("certificado");
    expect(traduzirRejeicao([{ codigo: "778", descricao: "Informado NCM inexistente" }])).toContain("NCM");
  });

  it("traduz pelo texto quando não há código conhecido", () => {
    expect(traduzirRejeicao([{ codigo: "E0310", descricao: "Código de tributação nacional inexistente" }])).toContain("código do serviço");
    expect(traduzirRejeicao([{ descricao: "Alíquota do ISS informada difere da cadastrada" }])).toContain("alíquota");
  });

  it("mantém a mensagem original quando não reconhece", () => {
    expect(traduzirRejeicao([{ descricao: "Algo muito específico" }])).toContain("Algo muito específico");
    expect(traduzirRejeicao([])).toContain("sem motivo");
  });
});

describe("assinatura de webhook", () => {
  const segredo = "segredo-de-teste";
  const corpo = JSON.stringify({ tipo: "nfse", id: "abc" });

  it("aceita assinatura válida", () => {
    const cab = assinarWebhook(segredo, corpo, 1_800_000_000);
    expect(verificarAssinatura(segredo, corpo, cab, 1_800_000_010)).toEqual({ valida: true });
  });

  it("recusa corpo alterado, segredo errado, ausente ou expirada", () => {
    const cab = assinarWebhook(segredo, corpo, 1_800_000_000);
    expect(verificarAssinatura(segredo, corpo + " ", cab, 1_800_000_000).valida).toBe(false);
    expect(verificarAssinatura("outro", corpo, cab, 1_800_000_000).valida).toBe(false);
    expect(verificarAssinatura(segredo, corpo, null, 1_800_000_000).valida).toBe(false);
    expect(verificarAssinatura(segredo, corpo, cab, 1_800_000_000 + 301).motivo).toBe("Assinatura expirada.");
    expect(verificarAssinatura(segredo, corpo, "t=1800000000,v1=zz", 1_800_000_000).valida).toBe(false);
    expect(verificarAssinatura("", corpo, cab).valida).toBe(false);
  });
});
