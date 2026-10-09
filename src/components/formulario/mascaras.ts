import { formatarCEP, formatarTelefone } from "@/lib/dominio/contato";
import { formatarCNPJ, formatarCPF, normalizarDocumento } from "@/lib/dominio/documentos";
import { normalizarPlaca } from "@/lib/dominio/placa";

export type Mascara = "telefone" | "cpf" | "cnpj" | "cpfCnpj" | "cep" | "placa" | "dinheiro" | "decimal";

/** Aplica a máscara enquanto o usuário digita */
export function aplicarMascara(tipo: Mascara, valor: string): string {
  switch (tipo) {
    case "telefone":
      return formatarTelefone(valor);
    case "cpf":
      return formatarCPF(valor);
    case "cnpj":
      return formatarCNPJ(valor);
    case "cpfCnpj": {
      const doc = normalizarDocumento(valor);
      return doc.length <= 11 && /^\d*$/.test(doc) ? formatarCPF(doc) : formatarCNPJ(doc);
    }
    case "cep":
      return formatarCEP(valor);
    case "placa": {
      const p = normalizarPlaca(valor).slice(0, 7);
      return /^[A-Z]{3}\d{4}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
    }
    case "dinheiro": {
      // digita da direita para a esquerda: "12345" → "123,45"
      const d = valor.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
      if (!d) return "";
      const centavos = Number(d.slice(-15));
      return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    case "decimal":
      return valor.replace(/[^\d,]/g, "").replace(/(,.*?),/g, "$1");
  }
}

export const inputModeMascara: Record<Mascara, React.HTMLAttributes<HTMLInputElement>["inputMode"]> = {
  telefone: "tel",
  cpf: "numeric",
  cnpj: "text",
  cpfCnpj: "text",
  cep: "numeric",
  placa: "text",
  dinheiro: "decimal",
  decimal: "decimal",
};
