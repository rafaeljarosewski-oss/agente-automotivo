"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { casarItens, ErroXml, lerNFe, type Casamento, type NFeCompra } from "@/lib/estoque/xml-nfe";
import { executarAcao, verificar } from "@/lib/servidor/acao";
import { falha, sucesso } from "@/lib/servidor/resultado";
import { decimal, dinheiroOpcional, textoObrigatorio, textoOpcional, uuid, uuidOpcional } from "@/lib/validacao/comum";

const schemaEntrada = z.object({
  produto_id: uuid,
  quantidade: decimal("a quantidade").refine((v) => v > 0, "A quantidade deve ser maior que zero."),
  custo_unitario_centavos: dinheiroOpcional,
  motivo: textoOpcional,
  identificacao_rolo: textoOpcional,
  numeros_serie: z.array(z.string().trim().min(1)).default([]),
});

export async function registrarEntrada(entrada: z.input<typeof schemaEntrada>) {
  return executarAcao({ papeis: ["admin"], schema: schemaEntrada, entrada }, async (d, { supabase }) => {
    verificar(
      await supabase.rpc("registrar_entrada_estoque", {
        p_produto: d.produto_id,
        p_quantidade: d.quantidade,
        p_custo_unitario_centavos: d.custo_unitario_centavos || undefined,
        p_motivo: d.motivo ?? "Entrada manual",
        p_identificacao_rolo: d.identificacao_rolo ?? undefined,
        p_numeros_serie: d.numeros_serie,
      }),
    );
    revalidatePath("/estoque");
    revalidatePath(`/estoque/${d.produto_id}`);
    return sucesso(undefined, "Entrada registrada.");
  });
}

const schemaAjuste = z.object({
  produto_id: uuid,
  quantidade: decimal("a quantidade", { min: -1e9 }).refine((v) => v !== 0, "Informe uma quantidade diferente de zero."),
  motivo: textoObrigatorio("o motivo do ajuste"),
  rolo_id: uuidOpcional,
});

export async function ajustarEstoque(entrada: z.input<typeof schemaAjuste>) {
  return executarAcao({ papeis: ["admin"], schema: schemaAjuste, entrada }, async (d, { supabase }) => {
    verificar(await supabase.rpc("ajustar_estoque", { p_produto: d.produto_id, p_delta: d.quantidade, p_motivo: d.motivo, p_rolo: d.rolo_id ?? undefined }));
    revalidatePath("/estoque");
    revalidatePath(`/estoque/${d.produto_id}`);
    return sucesso(undefined, "Ajuste registrado.");
  });
}

// ---------------------------------------------------------------------------
// Importação do XML de NF-e de compra
// ---------------------------------------------------------------------------

export interface PreviaImportacao {
  nota: NFeCompra;
  casamentos: Casamento[];
  jaImportada: boolean;
  produtos: { id: string; nome: string; unidade: string; tipo_controle: "unidade" | "metro"; exige_numero_serie: boolean }[];
}

export async function analisarXml(formData: FormData) {
  return executarAcao({ papeis: ["admin"], schema: z.object({}), entrada: {} }, async (_d, { supabase, sessao }) => {
    const arquivo = formData.get("xml");
    if (!(arquivo instanceof File) || arquivo.size === 0) return falha("Selecione o arquivo XML da nota.");
    if (arquivo.size > 3 * 1024 * 1024) return falha("Arquivo muito grande para um XML de NF-e.");
    let nota: NFeCompra;
    try {
      nota = lerNFe(await arquivo.text());
    } catch (e) {
      return falha(e instanceof ErroXml ? e.message : "Não foi possível ler o XML.");
    }
    if (nota.destinatario_cnpj && nota.destinatario_cnpj !== sessao.empresa.cnpj) {
      return falha("Esta nota não foi emitida para a sua empresa (o CNPJ do destinatário é diferente).");
    }
    const [{ data: produtos }, { data: codigos }, { data: existente }] = await Promise.all([
      supabase.from("produtos").select("id, nome, codigo, codigo_barras, unidade, tipo_controle, exige_numero_serie").is("deleted_at", null).order("nome"),
      supabase.from("produto_codigos_fornecedor").select("produto_id, codigo_fornecedor").eq("fornecedor_cnpj", nota.fornecedor.cnpj),
      nota.chave ? supabase.from("notas_compra").select("id").eq("chave", nota.chave).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return sucesso<PreviaImportacao>({
      nota,
      casamentos: casarItens(nota.itens, produtos ?? [], codigos ?? []),
      jaImportada: Boolean(existente),
      produtos: (produtos ?? []).map(({ codigo: _c, codigo_barras: _b, ...p }) => p),
    });
  });
}

const schemaImportacao = z.object({
  xml: z.string().min(10),
  criar_contas_pagar: z.boolean().default(true),
  itens: z.array(
    z.object({
      numero: z.number().int(),
      acao: z.enum(["vincular", "criar", "ignorar"]),
      produto_id: uuidOpcional,
      quantidade: decimal("a quantidade").refine((v) => v > 0, "Quantidade inválida."),
      tipo_controle: z.enum(["unidade", "metro"]).default("unidade"),
      preco_venda_centavos: dinheiroOpcional,
      identificacao_rolo: textoOpcional,
    }),
  ),
});

export async function importarXml(entrada: z.input<typeof schemaImportacao>) {
  return executarAcao({ papeis: ["admin"], schema: schemaImportacao, entrada }, async (d, { supabase, sessao }) => {
    const nota = lerNFe(d.xml);
    if (nota.chave) {
      const { data: existente } = await supabase.from("notas_compra").select("id").eq("chave", nota.chave).maybeSingle();
      if (existente) return falha("Esta nota de compra já foi importada.");
    }
    const caminho = `${sessao.empresa.id}/compras/${nota.chave ?? `${nota.fornecedor.cnpj}-${nota.numero}`}.xml`;
    await supabase.storage.from("empresa").upload(caminho, new Blob([d.xml], { type: "application/xml" }), { upsert: true, contentType: "application/xml" });
    const compra = verificar(
      await supabase
        .from("notas_compra")
        .insert({
          chave: nota.chave,
          numero: nota.numero,
          serie: nota.serie,
          fornecedor_cnpj: nota.fornecedor.cnpj,
          fornecedor_nome: nota.fornecedor.nome,
          data_emissao: nota.data_emissao,
          valor_total_centavos: nota.valor_total_centavos,
          xml_path: caminho,
        })
        .select("id")
        .single(),
    );

    let entradas = 0;
    let criados = 0;
    for (const escolha of d.itens) {
      if (escolha.acao === "ignorar") continue;
      const item = nota.itens.find((i) => i.numero === escolha.numero);
      if (!item) continue;
      const custoUnit = escolha.quantidade > 0 ? Math.round(item.valor_total_centavos / escolha.quantidade) : item.valor_unitario_centavos;
      let produtoId = escolha.produto_id;
      if (escolha.acao === "criar" || !produtoId) {
        const novo = verificar(
          await supabase
            .from("produtos")
            .insert({
              nome: item.descricao,
              codigo: null,
              codigo_barras: item.ean,
              categoria: escolha.tipo_controle === "metro" ? "pelicula" : /LAMPADA|LED/i.test(item.descricao) ? "lampada" : /ALARME/i.test(item.descricao) ? "alarme" : "outro",
              tipo_controle: escolha.tipo_controle,
              unidade: escolha.tipo_controle === "metro" ? "M" : item.unidade.slice(0, 6),
              largura_rolo_m: escolha.tipo_controle === "metro" ? 1.52 : null,
              preco_venda_centavos: escolha.preco_venda_centavos || Math.round(custoUnit * 2),
              custo_centavos: custoUnit,
              ncm: item.ncm,
              cfop: "5102",
              csosn: "102",
              fiscal_validado: false,
            })
            .select("id")
            .single(),
        );
        produtoId = novo.id;
        criados++;
      }
      await supabase
        .from("produto_codigos_fornecedor")
        .upsert({ produto_id: produtoId, fornecedor_cnpj: nota.fornecedor.cnpj, codigo_fornecedor: item.codigo }, { onConflict: "empresa_id,fornecedor_cnpj,codigo_fornecedor" });
      verificar(
        await supabase.rpc("registrar_entrada_estoque", {
          p_produto: produtoId,
          p_quantidade: escolha.quantidade,
          p_custo_unitario_centavos: custoUnit,
          p_motivo: `NF-e de compra nº ${nota.numero} — ${nota.fornecedor.nome}`,
          p_identificacao_rolo: escolha.identificacao_rolo ?? `NF ${nota.numero} item ${item.numero}`,
          p_nota_compra: compra.id,
        }),
      );
      entradas++;
    }

    if (d.criar_contas_pagar && nota.duplicatas.length) {
      const { data: categoria } = await supabase.from("categorias_financeiras").select("id").eq("nome", "Fornecedores de material").maybeSingle();
      await supabase.from("contas_pagar").insert(
        nota.duplicatas.map((dup, i) => ({
          categoria_id: categoria?.id ?? null,
          fornecedor: nota.fornecedor.nome,
          descricao: `NF-e ${nota.numero} — parcela ${dup.numero || i + 1}/${nota.duplicatas.length}`,
          documento: nota.numero,
          valor_centavos: dup.valor_centavos,
          vencimento: dup.vencimento,
          nota_compra_id: compra.id,
        })),
      );
    }
    revalidatePath("/estoque");
    return sucesso(
      { entradas, criados },
      `Nota importada: ${entradas} entrada(s) no estoque${criados ? `, ${criados} produto(s) novo(s) — revise os dados fiscais` : ""}${d.criar_contas_pagar && nota.duplicatas.length ? ` e ${nota.duplicatas.length} conta(s) a pagar` : ""}.`,
    );
  });
}
