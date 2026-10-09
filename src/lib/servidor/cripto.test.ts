import { describe, expect, it } from "vitest";

import { criptografar, descriptografar } from "./cripto";

describe("criptografia de segredos", () => {
  it("cifra e decifra, com IV aleatório", () => {
    const a = criptografar("CSC-123456");
    const b = criptografar("CSC-123456");
    expect(a).not.toBe(b);
    expect(a).not.toContain("CSC-123456");
    expect(descriptografar(a)).toBe("CSC-123456");
  });

  it("detecta adulteração", () => {
    const partes = criptografar("segredo").split(".");
    partes[3] = Buffer.from("outro").toString("base64");
    expect(() => descriptografar(partes.join("."))).toThrow();
  });
});
