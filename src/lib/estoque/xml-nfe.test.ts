import { describe, expect, it } from "vitest";

import { casarItens, lerNFe, similaridade } from "./xml-nfe";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe><infNFe Id="NFe43261012345678000190550010000458711458712347" versao="4.00">
    <ide><cUF>43</cUF><natOp>VENDA</natOp><mod>55</mod><serie>1</serie><nNF>45871</nNF><dhEmi>2026-10-01T10:00:00-03:00</dhEmi></ide>
    <emit><CNPJ>12345678000190</CNPJ><xNome>Distribuidora Autopeças Sul LTDA</xNome><xFant>AutoSul</xFant></emit>
    <dest><CNPJ>45781263000113</CNPJ></dest>
    <det nItem="1"><prod><cProd>F-LMP-H7-LED</cProd><cEAN>SEM GTIN</cEAN><xProd>LAMPADA LED H7 6000K PAR</xProd><NCM>85395200</NCM><CFOP>5405</CFOP><uCom>PAR</uCom><qCom>10.0000</qCom><vUnCom>60.0000000000</vUnCom><vProd>600.00</vProd></prod></det>
    <det nItem="2"><prod><cProd>998877</cProd><cEAN>7898612345028</cEAN><xProd>LAMPADA LED H4</xProd><NCM>85395200</NCM><CFOP>5405</CFOP><uCom>UN</uCom><qCom>4</qCom><vUnCom>64.00</vUnCom><vProd>256.00</vProd></prod></det>
    <det nItem="3"><prod><cProd>NOVO-1</cProd><cEAN>SEM GTIN</cEAN><xProd>PELICULA AUTOMOTIVA G35 ROLO 1,52X30M</xProd><NCM>39206219</NCM><CFOP>6102</CFOP><uCom>RL</uCom><qCom>1</qCom><vUnCom>435.00</vUnCom><vProd>435.00</vProd></prod></det>
    <det nItem="4"><prod><cProd>XPTO</cProd><cEAN>SEM GTIN</cEAN><xProd>PARAFUSO SEXTAVADO</xProd><NCM>73181500</NCM><CFOP>5102</CFOP><uCom>CX</uCom><qCom>2</qCom><vUnCom>15.5</vUnCom><vProd>31.00</vProd></prod></det>
    <total><ICMSTot><vNF>1322.00</vNF></ICMSTot></total>
    <cobr><dup><nDup>001</nDup><dVenc>2026-11-01</dVenc><vDup>661.00</vDup></dup><dup><nDup>002</nDup><dVenc>2026-12-01</dVenc><vDup>661.00</vDup></dup></cobr>
  </infNFe></NFe>
  <protNFe><infProt><chNFe>43261012345678000190550010000458711458712347</chNFe></infProt></protNFe>
</nfeProc>`;

describe("leitura do XML de NF-e de compra", () => {
  it("lê cabeçalho, itens e duplicatas", () => {
    const n = lerNFe(XML);
    expect(n.chave).toBe("43261012345678000190550010000458711458712347");
    expect(n.numero).toBe("45871");
    expect(n.fornecedor).toEqual({ cnpj: "12345678000190", nome: "Distribuidora Autopeças Sul LTDA", fantasia: "AutoSul" });
    expect(n.valor_total_centavos).toBe(132200);
    expect(n.itens).toHaveLength(4);
    expect(n.itens[0]).toMatchObject({ codigo: "F-LMP-H7-LED", ean: null, unidade: "PAR", quantidade: 10, valor_unitario_centavos: 6000, valor_total_centavos: 60000 });
    expect(n.itens[1]!.ean).toBe("7898612345028");
    expect(n.duplicatas).toEqual([
      { numero: "001", vencimento: "2026-11-01", valor_centavos: 66100 },
      { numero: "002", vencimento: "2026-12-01", valor_centavos: 66100 },
    ]);
  });

  it("recusa arquivos que não são NF-e", () => {
    expect(() => lerNFe("texto qualquer")).toThrow("não é um XML");
    expect(() => lerNFe("<CTe><infCte/></CTe>")).toThrow("não é de uma NF-e");
  });

  it("casa itens por código do fornecedor, EAN, código e descrição", () => {
    const n = lerNFe(XML);
    const produtos = [
      { id: "h7", nome: "Lâmpada LED H7 6000K (par)", codigo: "LMP-H7-LED", codigo_barras: null },
      { id: "h4", nome: "Lâmpada LED H4 6000K (par)", codigo: "LMP-H4-LED", codigo_barras: "7898612345028" },
      { id: "g35", nome: "Película automotiva G35 — rolo 1,52 m", codigo: "PEL-G35", codigo_barras: null },
    ];
    const casados = casarItens(n.itens, produtos, [{ produto_id: "h7", codigo_fornecedor: "F-LMP-H7-LED" }]);
    expect(casados.map((c) => [c.produto_id, c.criterio])).toEqual([
      ["h7", "codigo_fornecedor"],
      ["h4", "codigo_barras"],
      ["g35", "descricao"],
      [null, null],
    ]);
    expect(similaridade("PELICULA AUTOMOTIVA G35 ROLO", "Película automotiva G35 — rolo 1,52 m")).toBeGreaterThan(0.5);
  });
});
