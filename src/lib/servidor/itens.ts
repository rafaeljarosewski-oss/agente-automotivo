import "server-only";

import { areaTotal, calcularItem, calcularTotais, consumoPorArea, type Totais } from "@/lib/dominio/calculos";
import type { ClienteSupabase } from "@/lib/supabase/server";
import type { ItemValidado } from "@/lib/validacao/itens";

export interface ItemPreparado {
  ordem: number;
  tipo: "servico" | "produto";
  servico_id: string | null;
  produto_id: string | null;
  linha_pelicula_id: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario_centavos: number;
  desconto_centavos: number;
  total_centavos: number;
  medidas: ItemValidado["medidas"] | null;
  area_m2: number | null;
  consumo_metros: number | null;
  instalador_id: string | null;
  numeros_serie: string[];
}

/**
 * Recalcula no servidor tudo o que não deve vir pronto do navegador:
 * área (m²) das medidas, consumo de película (tabela linha × categoria ou largura do rolo) e totais.
 */
export async function prepararItens(
  supabase: ClienteSupabase,
  itens: ItemValidado[],
  categoriaId: string | null,
  descontoTotal: number,
): Promise<{ itens: ItemPreparado[]; totais: Totais }> {
  const servicoIds = [...new Set(itens.map((i) => i.servico_id).filter(Boolean))] as string[];
  const linhaIds = [...new Set(itens.map((i) => i.linha_pelicula_id).filter(Boolean))] as string[];

  const [{ data: servicos }, { data: tabela }] = await Promise.all([
    servicoIds.length
      ? supabase.from("servicos").select("id, tipo_preco, perda_percentual, produto_consumo_id, produtos:produto_consumo_id(largura_rolo_m)").in("id", servicoIds)
      : Promise.resolve({ data: [] as never[] }),
    linhaIds.length && categoriaId
      ? supabase.from("tabela_precos_pelicula").select("linha_id, consumo_metros").in("linha_id", linhaIds).eq("categoria_id", categoriaId)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const preparados: ItemPreparado[] = itens.map((item, ordem) => {
    let quantidade = item.quantidade;
    let area: number | null = null;
    let consumo = item.consumo_metros ?? null;
    let medidas = item.medidas && item.medidas.length > 0 ? item.medidas : null;
    let unidade = item.unidade;

    if (item.tipo === "servico") {
      const s = servicos?.find((x) => x.id === item.servico_id);
      if (s?.tipo_preco === "m2") {
        area = medidas ? areaTotal(medidas) : quantidade;
        quantidade = area;
        unidade = "M2";
        const largura = Number((s.produtos as { largura_rolo_m: number | null } | null)?.largura_rolo_m ?? 0);
        consumo = s.produto_consumo_id && largura > 0 ? consumoPorArea(area, largura, Number(s.perda_percentual)) : null;
      } else {
        medidas = null;
      }
      if (item.linha_pelicula_id) {
        const t = tabela?.find((x) => x.linha_id === item.linha_pelicula_id);
        if (t) consumo = Number(t.consumo_metros);
      }
    } else {
      medidas = null;
      consumo = null;
    }

    const calc = calcularItem({ quantidade, preco_unitario_centavos: item.preco_unitario_centavos, desconto_centavos: item.desconto_centavos });
    return {
      ordem,
      tipo: item.tipo,
      servico_id: item.tipo === "servico" ? item.servico_id : null,
      produto_id: item.tipo === "produto" ? item.produto_id : null,
      linha_pelicula_id: item.tipo === "servico" ? item.linha_pelicula_id : null,
      descricao: item.descricao,
      quantidade,
      unidade,
      preco_unitario_centavos: item.preco_unitario_centavos,
      desconto_centavos: calc.desconto_centavos,
      total_centavos: calc.total_centavos,
      medidas,
      area_m2: area,
      consumo_metros: consumo,
      instalador_id: item.instalador_id,
      numeros_serie: item.numeros_serie,
    };
  });

  const totais = calcularTotais(
    preparados.map((i) => ({ quantidade: i.quantidade, preco_unitario_centavos: i.preco_unitario_centavos, desconto_centavos: i.desconto_centavos })),
    descontoTotal,
  );
  return { itens: preparados, totais };
}
