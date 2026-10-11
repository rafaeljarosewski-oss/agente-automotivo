import "server-only";

import type { ClienteSupabase } from "@/lib/supabase/server";

export interface ServicoEditor {
  id: string;
  nome: string;
  tipo_preco: "fixo" | "categoria" | "m2" | "pelicula";
  preco_centavos: number;
  precos_categoria: Record<string, number>;
  produto_consumo_id: string | null;
  perda_percentual: number;
  largura_rolo_m: number | null;
}

export interface ProdutoEditor {
  id: string;
  nome: string;
  codigo: string | null;
  unidade: string;
  preco_venda_centavos: number;
  estoque_atual: number;
  exige_numero_serie: boolean;
}

export interface LinhaEditor {
  id: string;
  nome: string;
  marca: string | null;
  servico_id: string | null;
}

export interface CatalogoEditor {
  servicos: ServicoEditor[];
  produtos: ProdutoEditor[];
  linhas: LinhaEditor[];
  tabela: { linha_id: string; categoria_id: string; preco_centavos: number; consumo_metros: number }[];
  categorias: { id: string; nome: string }[];
}

/** Catálogo ativo usado pelos editores de orçamento e OS */
export async function carregarCatalogoEditor(supabase: ClienteSupabase): Promise<CatalogoEditor> {
  const [servicos, precos, produtos, linhas, tabela, categorias] = await Promise.all([
    supabase.from("servicos").select("*").is("deleted_at", null).eq("ativo", true).order("nome"),
    supabase.from("servico_precos_categoria").select("servico_id, categoria_id, preco_centavos"),
    supabase.from("produtos").select("id, nome, codigo, unidade, preco_venda_centavos, estoque_atual, exige_numero_serie, largura_rolo_m, ativo, deleted_at").order("nome"),
    supabase.from("linhas_pelicula").select("id, nome, marca, servico_id").is("deleted_at", null).eq("ativo", true).order("ordem"),
    supabase.from("tabela_precos_pelicula").select("linha_id, categoria_id, preco_centavos, consumo_metros"),
    supabase.from("categorias_veiculo").select("id, nome").is("deleted_at", null).eq("ativo", true).order("ordem"),
  ]);
  const larguras = new Map((produtos.data ?? []).map((p) => [p.id, p.largura_rolo_m]));
  return {
    servicos: (servicos.data ?? []).map((s) => ({
      id: s.id,
      nome: s.nome,
      tipo_preco: s.tipo_preco,
      preco_centavos: s.preco_centavos,
      precos_categoria: Object.fromEntries((precos.data ?? []).filter((p) => p.servico_id === s.id).map((p) => [p.categoria_id, p.preco_centavos])),
      produto_consumo_id: s.produto_consumo_id,
      perda_percentual: Number(s.perda_percentual),
      largura_rolo_m: s.produto_consumo_id ? (larguras.get(s.produto_consumo_id) ?? null) : null,
    })),
    produtos: (produtos.data ?? [])
      .filter((p) => p.ativo && !p.deleted_at)
      .map(({ largura_rolo_m: _l, ativo: _a, deleted_at: _d, ...p }) => ({ ...p, estoque_atual: Number(p.estoque_atual) })),
    linhas: linhas.data ?? [],
    tabela: (tabela.data ?? []).map((t) => ({ ...t, consumo_metros: Number(t.consumo_metros) })),
    categorias: categorias.data ?? [],
  };
}
