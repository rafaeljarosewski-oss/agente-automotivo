import type { PapelUsuario } from "@/lib/supabase/tipos";

export interface ItemMenu {
  titulo: string;
  href: string;
  icone:
    | "painel"
    | "clientes"
    | "orcamentos"
    | "os"
    | "estoque"
    | "catalogo"
    | "notas"
    | "caixa"
    | "receber"
    | "pagar"
    | "relatorios"
    | "configuracoes";
  papeis: PapelUsuario[];
  grupo?: string;
}

export const MENU: ItemMenu[] = [
  { titulo: "Painel", href: "/", icone: "painel", papeis: ["admin", "atendente", "instalador"] },
  { titulo: "Clientes", href: "/clientes", icone: "clientes", papeis: ["admin", "atendente"] },
  { titulo: "Orçamentos", href: "/orcamentos", icone: "orcamentos", papeis: ["admin", "atendente"] },
  { titulo: "Ordens de serviço", href: "/os", icone: "os", papeis: ["admin", "atendente", "instalador"] },
  { titulo: "Notas fiscais", href: "/notas", icone: "notas", papeis: ["admin", "atendente"] },
  { titulo: "Caixa do dia", href: "/financeiro/caixa", icone: "caixa", papeis: ["admin", "atendente"], grupo: "Financeiro" },
  { titulo: "Contas a receber", href: "/financeiro/receber", icone: "receber", papeis: ["admin", "atendente"], grupo: "Financeiro" },
  { titulo: "Contas a pagar", href: "/financeiro/pagar", icone: "pagar", papeis: ["admin"], grupo: "Financeiro" },
  { titulo: "Estoque", href: "/estoque", icone: "estoque", papeis: ["admin", "atendente"], grupo: "Cadastros" },
  { titulo: "Catálogo", href: "/catalogo", icone: "catalogo", papeis: ["admin", "atendente"], grupo: "Cadastros" },
  { titulo: "Relatórios", href: "/relatorios", icone: "relatorios", papeis: ["admin"], grupo: "Gestão" },
  { titulo: "Configurações", href: "/configuracoes", icone: "configuracoes", papeis: ["admin"], grupo: "Gestão" },
];

export function menuDoPapel(papel: PapelUsuario) {
  return MENU.filter((m) => m.papeis.includes(papel));
}
