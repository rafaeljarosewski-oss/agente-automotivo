import "server-only";

import { gerarComissoes, gerarParcelas, type ComissaoGerada, type FormaPagamento, type Parcela } from "@/lib/dominio/calculos";
import { hojeISO } from "@/lib/dominio/datas";
import type { ClienteSupabase } from "@/lib/supabase/server";

/** Calcula parcelas e comissões da OS (regras em lib/dominio/calculos.ts) */
export async function calcularConclusao(
  supabase: ClienteSupabase,
  osId: string,
  forma: FormaPagamento | null,
  quantidadeParcelas: number,
): Promise<{ parcelas: Parcela[]; comissoes: ComissaoGerada[]; total: number } | null> {
  const { data: os } = await supabase
    .from("ordens_servico")
    .select("total_centavos, desconto_total_centavos, instalador_id, os_itens(id, tipo, quantidade, preco_unitario_centavos, desconto_centavos, instalador_id, servico_id)")
    .eq("id", osId)
    .maybeSingle();
  if (!os) return null;
  const servicoIds = [...new Set(os.os_itens.map((i) => i.servico_id).filter(Boolean))] as string[];
  const { data: servicos } = servicoIds.length
    ? await supabase.from("servicos").select("id, tipo_preco, comissao_tipo, comissao_percentual, comissao_fixo_centavos").in("id", servicoIds)
    : { data: [] };
  const comissoes = gerarComissoes(
    os.os_itens.map((i) => {
      const s = servicos?.find((x) => x.id === i.servico_id);
      return {
        id: i.id,
        tipo: i.tipo,
        quantidade: Number(i.quantidade),
        preco_unitario_centavos: i.preco_unitario_centavos,
        desconto_centavos: i.desconto_centavos,
        instalador_id: i.instalador_id,
        regra: s ? { comissao_tipo: s.comissao_tipo, comissao_percentual: Number(s.comissao_percentual), comissao_fixo_centavos: s.comissao_fixo_centavos } : null,
        cobrado_por_area: s?.tipo_preco === "m2",
      };
    }),
    os.desconto_total_centavos,
    os.instalador_id,
  );
  return { parcelas: gerarParcelas(os.total_centavos, forma, quantidadeParcelas, hojeISO()), comissoes, total: os.total_centavos };
}
