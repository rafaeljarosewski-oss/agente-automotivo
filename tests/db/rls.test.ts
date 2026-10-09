/**
 * Prova de isolamento multiempresa (Row Level Security).
 * Requer o Supabase local rodando: `npm run db:start` e depois `npm run test:db`.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { admin, anonimo, cpfAleatorio, criarEmpresaTeste, placaAleatoria, type EmpresaTeste } from "./ajuda";

let A: EmpresaTeste;
let B: EmpresaTeste;
const dadosB: Record<string, string> = {};
const dadosA: Record<string, string> = {};

beforeAll(async () => {
  [A, B] = await Promise.all([criarEmpresaTeste("Oficina Alfa"), criarEmpresaTeste("Oficina Beta")]);

  // Dados da empresa B criados pelo próprio admin de B (empresa_id preenchido automaticamente)
  const sbB = B.usuarios.admin.cliente;
  const { data: cli, error } = await sbB
    .from("clientes")
    .insert({ nome: "Cliente Secreto da Beta", cpf_cnpj: cpfAleatorio(), whatsapp: "51999990000" })
    .select()
    .single();
  if (error) throw error;
  dadosB.cliente = cli.id;
  expect(cli.empresa_id).toBe(B.id);

  const { data: cat } = await sbB.from("categorias_veiculo").select("id").eq("nome", "SUV").single();
  const { data: vei, error: ev } = await sbB
    .from("veiculos")
    .insert({ cliente_id: cli.id, placa: placaAleatoria(), modelo: "Compass", marca: "Jeep", categoria_id: cat!.id })
    .select()
    .single();
  if (ev) throw ev;
  dadosB.veiculo = vei.id;

  const { data: prod, error: ep } = await sbB
    .from("produtos")
    .insert({ nome: "Lâmpada LED H7 Beta", preco_venda_centavos: 9990, estoque_minimo: 2 })
    .select()
    .single();
  if (ep) throw ep;
  dadosB.produto = prod.id;

  const { data: num } = await sbB.rpc("proximo_numero", { p_empresa: B.id, p_chave: "orcamento" });
  const { data: orc, error: eo } = await sbB
    .from("orcamentos")
    .insert({ numero: num!, cliente_id: cli.id, veiculo_id: vei.id, total_centavos: 9990 })
    .select()
    .single();
  if (eo) throw eo;
  dadosB.orcamento = orc.id;

  const { error: ei } = await sbB.from("orcamento_itens").insert({
    orcamento_id: orc.id,
    tipo: "produto",
    produto_id: prod.id,
    descricao: prod.nome,
    quantidade: 1,
    preco_unitario_centavos: 9990,
    total_centavos: 9990,
  });
  if (ei) throw ei;

  const { data: osId, error: eos } = await sbB.rpc("gerar_os_de_orcamento", {
    p_orcamento: orc.id,
    p_instalador: B.usuarios.instalador.id,
  });
  if (eos) throw eos;
  dadosB.os = osId!;

  const { data: cp, error: ecp } = await sbB
    .from("contas_pagar")
    .insert({ descricao: "Aluguel Beta", valor_centavos: 250000, vencimento: "2026-10-10" })
    .select()
    .single();
  if (ecp) throw ecp;
  dadosB.contaPagar = cp.id;

  // Um cliente da empresa A, sem OS
  const { data: cliA } = await A.usuarios.admin.cliente.from("clientes").insert({ nome: "Cliente da Alfa" }).select().single();
  dadosA.cliente = cliA!.id;
});

describe("isolamento entre empresas", () => {
  const tabelas = [
    "clientes",
    "veiculos",
    "produtos",
    "orcamentos",
    "orcamento_itens",
    "ordens_servico",
    "os_itens",
    "contas_pagar",
    "categorias_veiculo",
    "empresa_config_fiscal",
    "perfis",
  ] as const;

  it.each(tabelas)("admin da empresa A não enxerga nenhum registro da empresa B em %s", async (tabela) => {
    const { data, error } = await A.usuarios.admin.cliente.from(tabela).select("empresa_id");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0 - 1);
    expect(data!.every((l) => l.empresa_id === A.id)).toBe(true);
  });

  it("admin da empresa A não lê a empresa B nem pelo ID", async () => {
    const sbA = A.usuarios.admin.cliente;
    const { data: cli } = await sbA.from("clientes").select("*").eq("id", dadosB.cliente!);
    expect(cli).toEqual([]);
    const { data: emp } = await sbA.from("empresas").select("*").eq("id", B.id);
    expect(emp).toEqual([]);
    const { data: os } = await sbA.from("ordens_servico").select("*").eq("id", dadosB.os!);
    expect(os).toEqual([]);
  });

  it("não é possível inserir registros na empresa B", async () => {
    const { error } = await A.usuarios.admin.cliente
      .from("clientes")
      .insert({ nome: "Invasor", empresa_id: B.id })
      .select();
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  it("não é possível alterar nem mover registros da empresa B", async () => {
    const sbA = A.usuarios.admin.cliente;
    const { data } = await sbA.from("clientes").update({ nome: "Alterado" }).eq("id", dadosB.cliente!).select();
    expect(data).toEqual([]);
    const { data: original } = await admin().from("clientes").select("nome").eq("id", dadosB.cliente!).single();
    expect(original!.nome).toBe("Cliente Secreto da Beta");

    const { error } = await sbA.from("clientes").update({ empresa_id: B.id }).eq("id", dadosA.cliente!).select();
    expect(error).not.toBeNull();
  });

  it("funções RPC respeitam a empresa", async () => {
    const sbA = A.usuarios.admin.cliente;
    const { error } = await sbA.rpc("proximo_numero", { p_empresa: B.id, p_chave: "os" });
    expect(error?.code).toBe("42501");

    const { error: e2 } = await sbA.rpc("gerar_os_de_orcamento", { p_orcamento: dadosB.orcamento! });
    expect(e2?.message).toContain("Orçamento não encontrado");

    const { error: e3 } = await sbA.rpc("alterar_status_os", { p_os: dadosB.os!, p_status: "em_execucao" });
    expect(e3?.message).toContain("OS não encontrada");

    const { data: busca } = await sbA.rpc("buscar_clientes", { p_termo: "Secreto" });
    expect(busca).toEqual([]);
  });

  it("usuário anônimo não acessa nada", async () => {
    const anon = anonimo();
    for (const tabela of ["clientes", "empresas", "ordens_servico", "notas_fiscais", "perfis"] as const) {
      const { data } = await anon.from(tabela).select("id");
      expect(data ?? []).toEqual([]);
    }
    const { error } = await anon.from("clientes").insert({ nome: "x", empresa_id: B.id });
    expect(error).not.toBeNull();
  });

  it("arquivos no Storage ficam isolados por empresa", async () => {
    const sbB = B.usuarios.admin.cliente;
    const caminho = `${B.id}/teste/segredo.txt`;
    const { error: up } = await sbB.storage.from("empresa").upload(caminho, new Blob(["confidencial"]), { upsert: true });
    expect(up).toBeNull();

    const { data, error } = await A.usuarios.admin.cliente.storage.from("empresa").download(caminho);
    expect(data).toBeNull();
    expect(error).not.toBeNull();

    const { error: upA } = await A.usuarios.admin.cliente.storage
      .from("empresa")
      .upload(`${B.id}/invasao.txt`, new Blob(["x"]));
    expect(upA).not.toBeNull();
  });
});

describe("permissões por papel", () => {
  it("atendente não acessa contas a pagar nem configuração fiscal", async () => {
    const sb = B.usuarios.atendente.cliente;
    const { data: cp } = await sb.from("contas_pagar").select("id");
    expect(cp).toEqual([]);
    const { data: cfg } = await sb.from("empresa_config_fiscal").select("empresa_id");
    expect(cfg).toEqual([]);
  });

  it("atendente lê o catálogo mas não altera", async () => {
    const sb = B.usuarios.atendente.cliente;
    const { data } = await sb.from("produtos").select("id").eq("id", dadosB.produto!);
    expect(data).toHaveLength(1);
    const { data: upd } = await sb.from("produtos").update({ preco_venda_centavos: 1 }).eq("id", dadosB.produto!).select();
    expect(upd).toEqual([]);
    const { error } = await sb.from("produtos").insert({ nome: "Produto do atendente" });
    expect(error?.code).toBe("42501");
  });

  it("instalador vê somente as OS atribuídas a ele", async () => {
    const instalador = B.usuarios.instalador.cliente;
    const { data: osVisiveis } = await instalador.from("ordens_servico").select("id");
    expect(osVisiveis!.map((o) => o.id)).toEqual([dadosB.os]);

    // Cria outra OS sem instalador: não deve aparecer
    const sbB = B.usuarios.admin.cliente;
    const { data: num } = await sbB.rpc("proximo_numero", { p_empresa: B.id, p_chave: "os" });
    await sbB.from("ordens_servico").insert({ numero: num!, cliente_id: dadosB.cliente! });
    const { data: depois } = await instalador.from("ordens_servico").select("id");
    expect(depois).toHaveLength(1);

    // Vê o cliente e o veículo da OS dele, mas não outros clientes
    const { data: clientes } = await instalador.from("clientes").select("id");
    expect(clientes!.map((c) => c.id)).toEqual([dadosB.cliente]);
    const { data: veiculos } = await instalador.from("veiculos").select("id");
    expect(veiculos!.map((v) => v.id)).toEqual([dadosB.veiculo]);
  });

  it("instalador não cadastra clientes nem vê contas a receber", async () => {
    const instalador = B.usuarios.instalador.cliente;
    const { error } = await instalador.from("clientes").insert({ nome: "Cliente do instalador" });
    expect(error?.code).toBe("42501");
    const { data } = await instalador.from("contas_receber").select("id");
    expect(data).toEqual([]);
  });

  it("instalador muda status da própria OS mas não cancela", async () => {
    const instalador = B.usuarios.instalador.cliente;
    const { error } = await instalador.rpc("alterar_status_os", { p_os: dadosB.os!, p_status: "em_execucao" });
    expect(error).toBeNull();
    const { error: e2 } = await instalador.rpc("alterar_status_os", {
      p_os: dadosB.os!,
      p_status: "cancelada",
      p_observacao: "teste",
    });
    expect(e2?.message).toContain("não podem cancelar");
  });

  it("instalador de outra empresa não altera a OS", async () => {
    const { error } = await A.usuarios.instalador.cliente.rpc("alterar_status_os", {
      p_os: dadosB.os!,
      p_status: "aguardando_peca",
    });
    expect(error).not.toBeNull();
  });

  it("somente o admin gerencia usuários da empresa", async () => {
    const { data } = await B.usuarios.atendente.cliente
      .from("perfis")
      .update({ papel: "admin" })
      .eq("id", B.usuarios.atendente.id)
      .select();
    expect(data).toEqual([]);
    const { data: ok } = await B.usuarios.admin.cliente
      .from("perfis")
      .update({ telefone: "51999999999" })
      .eq("id", B.usuarios.atendente.id)
      .select();
    expect(ok).toHaveLength(1);
  });
});

describe("auditoria e soft delete", () => {
  it("registra quem criou e quem alterou", async () => {
    const sb = B.usuarios.atendente.cliente;
    const { data: cli } = await sb.from("clientes").insert({ nome: "Auditoria" }).select().single();
    expect(cli!.created_by).toBe(B.usuarios.atendente.id);
    const { data: alt } = await B.usuarios.admin.cliente
      .from("clientes")
      .update({ nome: "Auditoria 2" })
      .eq("id", cli!.id)
      .select()
      .single();
    expect(alt!.created_by).toBe(B.usuarios.atendente.id);
    expect(alt!.updated_by).toBe(B.usuarios.admin.id);

    const { data: exc } = await sb
      .from("clientes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", cli!.id)
      .select()
      .single();
    expect(exc!.deleted_by).toBe(B.usuarios.atendente.id);
  });
});
