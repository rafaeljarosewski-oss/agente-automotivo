/**
 * Conclusão da OS: baixa de estoque (unidades, série e metros de película por rolo),
 * comissões e contas a receber — tudo numa transação.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { gerarParcelas } from "@/lib/dominio/calculos";
import { criarEmpresaTeste, placaAleatoria, type EmpresaTeste } from "./ajuda";

let E: EmpresaTeste;
const ids: Record<string, string> = {};

beforeAll(async () => {
  E = await criarEmpresaTeste("Oficina Conclusão");
  const sb = E.usuarios.admin.cliente;

  const { data: suv } = await sb.from("categorias_veiculo").select("id").eq("nome", "SUV").single();
  ids.suv = suv!.id;

  const { data: rolo } = await sb
    .from("produtos")
    .insert({ nome: "Película G20 — rolo 1,52 m", categoria: "pelicula", tipo_controle: "metro", unidade: "M", largura_rolo_m: 1.52 })
    .select()
    .single();
  ids.produtoRolo = rolo!.id;

  const { data: alarme } = await sb
    .from("produtos")
    .insert({ nome: "Alarme Pósitron", categoria: "alarme", exige_numero_serie: true, preco_venda_centavos: 39000 })
    .select()
    .single();
  ids.alarme = alarme!.id;

  const { data: lampada } = await sb
    .from("produtos")
    .insert({ nome: "Lâmpada H4", categoria: "lampada", preco_venda_centavos: 4500 })
    .select()
    .single();
  ids.lampada = lampada!.id;

  // Entradas: dois rolos (3 m e 30 m), 3 alarmes com série, 10 lâmpadas
  expect((await sb.rpc("registrar_entrada_estoque", { p_produto: ids.produtoRolo, p_quantidade: 3, p_identificacao_rolo: "R-ANTIGO" })).error).toBeNull();
  expect((await sb.rpc("registrar_entrada_estoque", { p_produto: ids.produtoRolo, p_quantidade: 30, p_identificacao_rolo: "R-NOVO" })).error).toBeNull();
  expect(
    (await sb.rpc("registrar_entrada_estoque", { p_produto: ids.alarme, p_quantidade: 3, p_numeros_serie: ["SN1", "SN2", "SN3"] })).error,
  ).toBeNull();
  expect((await sb.rpc("registrar_entrada_estoque", { p_produto: ids.lampada, p_quantidade: 10, p_custo_unitario_centavos: 2000 })).error).toBeNull();

  const { data: servico } = await sb
    .from("servicos")
    .insert({
      nome: "Aplicação de película automotiva",
      categoria: "pelicula_automotiva",
      tipo_preco: "pelicula",
      comissao_tipo: "percentual",
      comissao_percentual: 10,
    })
    .select()
    .single();
  ids.servico = servico!.id;

  const { data: linha } = await sb
    .from("linhas_pelicula")
    .insert({ nome: "G20", produto_id: ids.produtoRolo, servico_id: ids.servico })
    .select()
    .single();
  ids.linha = linha!.id;

  const { data: cliente } = await sb.from("clientes").insert({ nome: "Maria da Silva" }).select().single();
  ids.cliente = cliente!.id;
  const { data: veiculo } = await sb
    .from("veiculos")
    .insert({ cliente_id: cliente!.id, placa: placaAleatoria(), modelo: "Tiguan", categoria_id: ids.suv })
    .select()
    .single();
  ids.veiculo = veiculo!.id;
});

async function criarOS(itens: Record<string, unknown>[], total: number, instalador?: string) {
  const sb = E.usuarios.atendente.cliente;
  const { data: num } = await sb.rpc("proximo_numero", { p_empresa: E.id, p_chave: "os" });
  const { data: os, error } = await sb
    .from("ordens_servico")
    .insert({
      numero: num!,
      cliente_id: ids.cliente!,
      veiculo_id: ids.veiculo!,
      total_centavos: total,
      subtotal_centavos: total,
      instalador_id: instalador ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  const { data: criados, error: ei } = await sb
    .from("os_itens")
    .insert(itens.map((i, ordem) => ({ ...i, os_id: os.id, ordem })) as never, { defaultToNull: false })
    .select();
  if (ei) throw ei;
  return { os, itens: criados };
}

describe("conclusão da OS", () => {
  it("exige números de série dos alarmes", async () => {
    const { os } = await criarOS(
      [{ tipo: "produto", produto_id: ids.alarme, descricao: "Alarme", quantidade: 1, preco_unitario_centavos: 39000, total_centavos: 39000 }],
      39000,
    );
    const { error } = await E.usuarios.atendente.cliente.rpc("concluir_os", {
      p_os: os.id,
      p_parcelas: gerarParcelas(39000, "pix", 1, "2026-10-09") as never,
    });
    expect(error?.message).toContain("número(s) de série");
  });

  it("rejeita parcelas que não somam o total", async () => {
    const { os } = await criarOS(
      [{ tipo: "produto", produto_id: ids.lampada, descricao: "Lâmpada", quantidade: 1, preco_unitario_centavos: 4500, total_centavos: 4500 }],
      4500,
    );
    const { error } = await E.usuarios.atendente.cliente.rpc("concluir_os", {
      p_os: os.id,
      p_parcelas: gerarParcelas(4000, "pix", 1, "2026-10-09") as never,
    });
    expect(error?.message).toContain("soma das parcelas");
  });

  it("baixa estoque, gera comissão e contas a receber atomicamente", async () => {
    const total = 120000 + 39000 + 9000;
    const { os, itens } = await criarOS(
      [
        {
          tipo: "servico",
          servico_id: ids.servico,
          linha_pelicula_id: ids.linha,
          descricao: "Película G20 — SUV",
          quantidade: 1,
          preco_unitario_centavos: 120000,
          total_centavos: 120000,
          consumo_metros: 5.5,
        },
        {
          tipo: "produto",
          produto_id: ids.alarme,
          descricao: "Alarme Pósitron",
          quantidade: 1,
          preco_unitario_centavos: 39000,
          total_centavos: 39000,
          numeros_serie: ["SN2"],
        },
        { tipo: "produto", produto_id: ids.lampada, descricao: "Lâmpada H4", quantidade: 2, preco_unitario_centavos: 4500, total_centavos: 9000 },
      ],
      total,
      E.usuarios.instalador.id,
    );

    const parcelas = gerarParcelas(total, "credito_parcelado", 3, "2026-10-09");
    const comissoes = [
      { os_item_id: itens![0]!.id, instalador_id: E.usuarios.instalador.id, base_centavos: 120000, valor_centavos: 12000 },
    ];

    // O instalador da OS pode concluir
    const { error } = await E.usuarios.instalador.cliente.rpc("concluir_os", {
      p_os: os.id,
      p_parcelas: parcelas as never,
      p_comissoes: comissoes as never,
    });
    expect(error).toBeNull();

    const sb = E.usuarios.admin.cliente;

    // Película: 5,5 m → 3 m do rolo antigo (zera) + 2,5 m do rolo novo
    const { data: rolos } = await sb.from("rolos_pelicula").select("identificacao, saldo_metros, ativo").order("created_at");
    expect(rolos).toEqual([
      { identificacao: "R-ANTIGO", saldo_metros: 0, ativo: false },
      { identificacao: "R-NOVO", saldo_metros: 27.5, ativo: true },
    ]);
    const { data: prodRolo } = await sb.from("produtos").select("estoque_atual").eq("id", ids.produtoRolo!).single();
    expect(prodRolo!.estoque_atual).toBe(27.5);

    // Alarme: série SN2 vendida, estoque 2
    const { data: series } = await sb.from("numeros_serie").select("numero, status").eq("produto_id", ids.alarme!).order("numero");
    expect(series).toEqual([
      { numero: "SN1", status: "disponivel" },
      { numero: "SN2", status: "vendido" },
      { numero: "SN3", status: "disponivel" },
    ]);
    const { data: lamp } = await sb.from("produtos").select("estoque_atual").eq("id", ids.lampada!).single();
    expect(lamp!.estoque_atual).toBe(8);

    // Contas a receber
    const { data: titulos } = await sb
      .from("contas_receber")
      .select("parcela, total_parcelas, valor_centavos, vencimento, forma_pagamento")
      .eq("os_id", os.id)
      .order("parcela");
    expect(titulos).toEqual(
      parcelas.map((p) => ({
        parcela: p.parcela,
        total_parcelas: 3,
        valor_centavos: p.valor_centavos,
        vencimento: p.vencimento,
        forma_pagamento: "credito_parcelado",
      })),
    );

    // Comissão
    const { data: com } = await sb.from("comissoes").select("valor_centavos, instalador_id").eq("os_id", os.id);
    expect(com).toEqual([{ valor_centavos: 12000, instalador_id: E.usuarios.instalador.id }]);

    // Status e histórico
    const { data: concluida } = await sb.from("ordens_servico").select("status, concluida_em").eq("id", os.id).single();
    expect(concluida!.status).toBe("concluida");
    expect(concluida!.concluida_em).not.toBeNull();

    // Não conclui duas vezes
    const { error: e2 } = await sb.rpc("concluir_os", { p_os: os.id, p_parcelas: parcelas as never });
    expect(e2?.message).toContain("não pode ser concluída");
  });

  it("não vende o mesmo número de série duas vezes", async () => {
    const { os } = await criarOS(
      [
        {
          tipo: "produto",
          produto_id: ids.alarme,
          descricao: "Alarme",
          quantidade: 1,
          preco_unitario_centavos: 39000,
          total_centavos: 39000,
          numeros_serie: ["SN2"],
        },
      ],
      39000,
    );
    const { error } = await E.usuarios.atendente.cliente.rpc("concluir_os", {
      p_os: os.id,
      p_parcelas: gerarParcelas(39000, "dinheiro", 1, "2026-10-09") as never,
    });
    expect(error?.message).toContain("não está disponível");

    // Nada foi baixado (transação desfeita)
    const { data: lamp } = await E.usuarios.admin.cliente.from("produtos").select("estoque_atual").eq("id", ids.alarme!).single();
    expect(lamp!.estoque_atual).toBe(2);
  });

  it("caixa: recebimento em dinheiro exige caixa aberto e entra na conferência", async () => {
    const sb = E.usuarios.atendente.cliente;
    const { data: titulo } = await sb.from("contas_receber").select("id, valor_centavos").eq("status", "aberto").limit(1).single();
    const { error: semCaixa } = await sb.rpc("baixar_conta_receber", {
      p_conta: titulo!.id,
      p_valor_pago: titulo!.valor_centavos,
      p_forma: "dinheiro",
    });
    expect(semCaixa?.message).toContain("Abra o caixa");

    expect((await sb.rpc("abrir_caixa", { p_valor_abertura: 10000 })).error).toBeNull();
    expect((await sb.rpc("baixar_conta_receber", { p_conta: titulo!.id, p_valor_pago: titulo!.valor_centavos, p_forma: "dinheiro" })).error).toBeNull();
    expect((await sb.rpc("movimentar_caixa", { p_tipo: "sangria", p_valor: 5000, p_descricao: "Depósito no banco" })).error).toBeNull();

    const { data: caixaId } = await sb.rpc("caixa_aberto");
    const { data: resumo } = await sb.rpc("resumo_caixa", { p_caixa: caixaId! });
    const dinheiro = resumo!.find((r) => r.forma_pagamento === "dinheiro");
    expect(dinheiro!.esperado).toBe(10000 + titulo!.valor_centavos - 5000);

    const { error: ef } = await sb.rpc("fechar_caixa", { p_conferencia: { dinheiro: dinheiro!.esperado - 100 } });
    expect(ef).toBeNull();
    const { data: fechado } = await sb.from("caixas").select("status, diferenca_centavos").eq("id", caixaId!).single();
    expect(fechado).toEqual({ status: "fechado", diferenca_centavos: -100 });
  });
});
