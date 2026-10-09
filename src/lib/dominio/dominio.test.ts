import { describe, expect, it } from "vitest";

import {
  areaTotal,
  areaVidro,
  calcularComissao,
  calcularIbsCbs,
  calcularItem,
  calcularTotais,
  consumoPorArea,
  descontoPercentual,
  gerarComissoes,
  gerarParcelas,
  liquidoPorItem,
  precoPelicula,
  precoUnitarioServico,
} from "./calculos";
import { centavosParaTexto, dividirCentavos, formatarMoeda, multiplicarCentavos, ratear, textoParaCentavos } from "./dinheiro";
import { formatarCNPJ, formatarCPF, formatarCpfCnpj, validarCNPJ, validarCPF, validarCpfCnpj } from "./documentos";
import { converterParaMercosul, formatarPlaca, normalizarPlaca, validarPlaca } from "./placa";
import { formatarCEP, formatarTelefone, linkWhatsApp, numeroWhatsApp } from "./contato";
import { dataBrParaISO, formatarData, somarDias, somarMeses } from "./datas";

describe("dinheiro", () => {
  it("formata em reais", () => {
    expect(formatarMoeda(123456)).toBe("R$ 1.234,56");
    expect(formatarMoeda(5)).toBe("R$ 0,05");
    expect(formatarMoeda(null)).toBe("R$ 0,00");
    expect(centavosParaTexto(100050)).toBe("1.000,50");
  });

  it("converte texto digitado em centavos", () => {
    expect(textoParaCentavos("1.234,56")).toBe(123456);
    expect(textoParaCentavos("R$ 10")).toBe(1000);
    expect(textoParaCentavos("10,5")).toBe(1050);
    expect(textoParaCentavos("1234.56")).toBe(123456);
    expect(textoParaCentavos("0,005")).toBe(1);
    expect(textoParaCentavos("abc")).toBeNull();
    expect(textoParaCentavos("")).toBeNull();
  });

  it("multiplica sem erro de ponto flutuante", () => {
    expect(multiplicarCentavos(4500, 2.5)).toBe(11250);
    expect(multiplicarCentavos(333, 3)).toBe(999);
    expect(multiplicarCentavos(1999, 1.005)).toBe(2009); // 2008,995 → 2009
    expect(multiplicarCentavos(12000, 0.1)).toBe(1200);
  });

  it("divide e rateia mantendo a soma exata", () => {
    expect(dividirCentavos(1000, 3)).toEqual([334, 333, 333]);
    expect(dividirCentavos(100, 1)).toEqual([100]);
    const r = ratear(1000, [3000, 2000, 1000]);
    expect(r.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(r).toEqual([500, 333, 167]);
    expect(ratear(1, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe("documentos", () => {
  it("valida CPF", () => {
    expect(validarCPF("529.982.247-25")).toBe(true);
    expect(validarCPF("52998224725")).toBe(true);
    expect(validarCPF("529.982.247-24")).toBe(false);
    expect(validarCPF("111.111.111-11")).toBe(false);
    expect(validarCPF("123")).toBe(false);
  });

  it("valida CNPJ numérico e alfanumérico", () => {
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
    expect(validarCNPJ("11222333000182")).toBe(false);
    expect(validarCNPJ("00.000.000/0000-00")).toBe(false);
    // Exemplo oficial da Receita Federal para o CNPJ alfanumérico
    expect(validarCNPJ("12.ABC.345/01DE-35")).toBe(true);
    expect(validarCNPJ("12ABC34501DE36")).toBe(false);
  });

  it("formata documentos", () => {
    expect(formatarCPF("52998224725")).toBe("529.982.247-25");
    expect(formatarCNPJ("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCNPJ("12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(formatarCpfCnpj("52998224725")).toBe("529.982.247-25");
    expect(validarCpfCnpj("11.222.333/0001-81")).toBe(true);
  });
});

describe("placa", () => {
  it("valida padrão antigo e Mercosul", () => {
    expect(validarPlaca("ABC-1234")).toBe(true);
    expect(validarPlaca("abc1d23")).toBe(true);
    expect(validarPlaca("AB-12345")).toBe(false);
    expect(validarPlaca("ABC12D3")).toBe(false);
    expect(validarPlaca("")).toBe(false);
  });

  it("normaliza e formata", () => {
    expect(normalizarPlaca("abc-1234")).toBe("ABC1234");
    expect(formatarPlaca("abc1234")).toBe("ABC-1234");
    expect(formatarPlaca("abc1d23")).toBe("ABC1D23");
    expect(converterParaMercosul("ABC1234")).toBe("ABC1C34");
  });
});

describe("contato", () => {
  it("formata telefone e CEP", () => {
    expect(formatarTelefone("51987654321")).toBe("(51) 98765-4321");
    expect(formatarTelefone("5133334444")).toBe("(51) 3333-4444");
    expect(formatarTelefone("5551987654321")).toBe("(51) 98765-4321");
    expect(formatarCEP("90010000")).toBe("90010-000");
  });

  it("monta link do WhatsApp", () => {
    expect(numeroWhatsApp("(51) 98765-4321")).toBe("5551987654321");
    expect(linkWhatsApp("51987654321", "Olá, tudo bem?")).toBe("https://wa.me/5551987654321?text=Ol%C3%A1%2C%20tudo%20bem%3F");
    expect(linkWhatsApp(null, "Oi")).toBe("https://wa.me/?text=Oi");
  });
});

describe("datas", () => {
  it("formata dd/mm/aaaa", () => {
    expect(formatarData("2026-10-09")).toBe("09/10/2026");
    expect(formatarData("2026-10-09T02:00:00Z")).toBe("08/10/2026"); // 23h do dia 8 em Brasília
    expect(dataBrParaISO("31/12/2026")).toBe("2026-12-31");
    expect(dataBrParaISO("31/02/2026")).toBeNull();
  });

  it("soma dias e meses", () => {
    expect(somarDias("2026-10-09", 30)).toBe("2026-11-08");
    expect(somarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(somarMeses("2026-11-15", 2)).toBe("2027-01-15");
  });
});

describe("preço de serviços e película", () => {
  const hatch = "cat-hatch";
  const suv = "cat-suv";

  it("usa o preço por categoria do veículo", () => {
    const servico = { tipo_preco: "categoria" as const, preco_centavos: 10000, precos_categoria: { [suv]: 15000 } };
    expect(precoUnitarioServico(servico, suv)).toBe(15000);
    expect(precoUnitarioServico(servico, hatch)).toBe(10000); // sem preço específico: preço base
    expect(precoUnitarioServico(servico, null)).toBe(10000);
    expect(precoUnitarioServico({ tipo_preco: "fixo", preco_centavos: 8000 }, suv)).toBe(8000);
  });

  it("busca preço e consumo na tabela de película", () => {
    const tabela = [
      { linha_id: "g5", categoria_id: hatch, preco_centavos: 25000, consumo_metros: 3.5 },
      { linha_id: "g5", categoria_id: suv, preco_centavos: 35000, consumo_metros: 5 },
    ];
    expect(precoPelicula(tabela, "g5", suv)).toEqual({ preco_centavos: 35000, consumo_metros: 5 });
    expect(precoPelicula(tabela, "g20", suv)).toBeNull();
    expect(precoPelicula(tabela, "g5", null)).toBeNull();
  });

  it("calcula m² dos vidros", () => {
    expect(areaVidro({ largura_m: 1.2, altura_m: 1.5, quantidade: 2 })).toBe(3.6);
    expect(areaVidro({ largura_m: 0, altura_m: 1, quantidade: 1 })).toBe(0);
    expect(
      areaTotal([
        { largura_m: 1.2, altura_m: 1.5, quantidade: 2 },
        { largura_m: 0.6, altura_m: 0.45, quantidade: 1 },
      ]),
    ).toBe(3.87);
  });

  it("calcula o consumo de película residencial pela largura do rolo", () => {
    expect(consumoPorArea(3.87, 1.52, 10)).toBe(2.81); // 3,87/1,52 × 1,10 = 2,8007 → 2,81
    expect(consumoPorArea(1.52, 1.52, 0)).toBe(1);
    expect(consumoPorArea(0, 1.52)).toBe(0);
    expect(() => consumoPorArea(1, 0)).toThrow();
  });
});

describe("totais com desconto", () => {
  it("calcula item com desconto limitado ao valor bruto", () => {
    expect(calcularItem({ quantidade: 2, preco_unitario_centavos: 5000, desconto_centavos: 1000 })).toEqual({
      bruto_centavos: 10000,
      desconto_centavos: 1000,
      total_centavos: 9000,
    });
    expect(calcularItem({ quantidade: 1, preco_unitario_centavos: 500, desconto_centavos: 900 }).total_centavos).toBe(0);
    expect(() => calcularItem({ quantidade: 0, preco_unitario_centavos: 1 })).toThrow();
  });

  it("soma itens e aplica desconto no total", () => {
    const itens = [
      { quantidade: 1, preco_unitario_centavos: 35000 },
      { quantidade: 2, preco_unitario_centavos: 4990, desconto_centavos: 980 },
      { quantidade: 3.87, preco_unitario_centavos: 12000 },
    ];
    expect(calcularTotais(itens, 2000)).toEqual({
      subtotal_centavos: 35000 + 9980 + 46440,
      desconto_itens_centavos: 980,
      desconto_total_centavos: 2000,
      total_centavos: 35000 + 9000 + 46440 - 2000,
    });
    // desconto no total nunca deixa o total negativo
    expect(calcularTotais([{ quantidade: 1, preco_unitario_centavos: 1000 }], 5000).total_centavos).toBe(0);
    expect(descontoPercentual(90440, 10)).toBe(9044);
  });

  it("rateia o desconto do total entre os itens", () => {
    const itens = [
      { quantidade: 1, preco_unitario_centavos: 30000 },
      { quantidade: 1, preco_unitario_centavos: 10000 },
    ];
    const liquidos = liquidoPorItem(itens, 1001);
    expect(liquidos.reduce((a, b) => a + b, 0)).toBe(40000 - 1001);
    expect(liquidos).toEqual([29249, 9750]);
  });
});

describe("comissão", () => {
  const pct = { comissao_tipo: "percentual" as const, comissao_percentual: 15, comissao_fixo_centavos: 0 };
  const fixo = { comissao_tipo: "fixo" as const, comissao_percentual: 0, comissao_fixo_centavos: 2500 };

  it("calcula percentual e fixo", () => {
    expect(calcularComissao(pct, 35000, 1)).toBe(5250);
    expect(calcularComissao(fixo, 35000, 2)).toBe(5000);
    expect(calcularComissao(fixo, 46440, 3.87, true)).toBe(2500); // por m²: fixo por serviço
    expect(calcularComissao({ ...pct, comissao_tipo: "nenhuma" }, 35000, 1)).toBe(0);
  });

  it("gera comissões por instalador do item ou da OS, sobre o valor líquido", () => {
    const itens = [
      { id: "i1", tipo: "servico" as const, quantidade: 1, preco_unitario_centavos: 30000, instalador_id: null, regra: pct },
      { id: "i2", tipo: "servico" as const, quantidade: 1, preco_unitario_centavos: 10000, instalador_id: "ana", regra: fixo },
      { id: "i3", tipo: "produto" as const, quantidade: 1, preco_unitario_centavos: 10000, instalador_id: "ana", regra: null },
    ];
    const comissoes = gerarComissoes(itens, 5000, "joao");
    expect(comissoes).toEqual([
      { os_item_id: "i1", instalador_id: "joao", base_centavos: 27000, valor_centavos: 4050 },
      { os_item_id: "i2", instalador_id: "ana", base_centavos: 9000, valor_centavos: 2500 },
    ]);
    expect(gerarComissoes(itens, 0, null)).toHaveLength(1); // i1 sem instalador não gera
  });
});

describe("parcelas", () => {
  it("à vista gera uma parcela na data base", () => {
    expect(gerarParcelas(10000, "pix", 3, "2026-10-09")).toEqual([
      { parcela: 1, valor_centavos: 10000, vencimento: "2026-10-09", forma_pagamento: "pix" },
    ]);
    expect(gerarParcelas(10000, null, 1, "2026-10-09")[0]?.forma_pagamento).toBeNull();
    expect(gerarParcelas(0, "pix", 1, "2026-10-09")).toEqual([]);
  });

  it("crédito parcelado vence a cada 30 dias e soma exatamente o total", () => {
    const p = gerarParcelas(100000, "credito_parcelado", 3, "2026-10-09");
    expect(p.map((x) => x.valor_centavos)).toEqual([33334, 33333, 33333]);
    expect(p.map((x) => x.vencimento)).toEqual(["2026-11-08", "2026-12-08", "2027-01-07"]);
  });

  it("boleto vence mensalmente a partir de 30 dias", () => {
    const p = gerarParcelas(30000, "boleto", 2, "2026-10-09");
    expect(p.map((x) => x.vencimento)).toEqual(["2026-11-08", "2026-12-08"]);
  });
});

describe("IBS/CBS", () => {
  it("calcula valores informativos de 2026", () => {
    expect(calcularIbsCbs(100000, { ibs_uf: 0.1, ibs_mun: 0, cbs: 0.9 })).toEqual({
      ibs_uf_centavos: 100,
      ibs_mun_centavos: 0,
      ibs_centavos: 100,
      cbs_centavos: 900,
    });
  });
});

describe("geração de dígitos verificadores", () => {
  it("completa CPF e CNPJ", async () => {
    const { completarCNPJ, completarCPF } = await import("./documentos");
    expect(completarCPF("529982247")).toBe("52998224725");
    expect(completarCNPJ("112223330001")).toBe("11222333000181");
    expect(completarCNPJ("12ABC34501DE")).toBe("12ABC34501DE35");
  });
});
