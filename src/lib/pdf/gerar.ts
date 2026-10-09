import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";

import { ROTULO_FORMA_PAGAMENTO, ROTULO_STATUS_OS } from "@/lib/dominio/rotulos";
import type { ClienteAdmin } from "@/lib/supabase/admin";
import type { ClienteSupabase } from "@/lib/supabase/server";
import type { Tabela } from "@/lib/supabase/tipos";
import type { DadosEmpresaPdf } from "./comum";
import { DocumentoComercial, type DocumentoComercialPdf } from "./orcamento";

type Cliente = ClienteSupabase | ClienteAdmin;

async function dadosEmpresa(supabase: Cliente, empresa: Tabela<"empresas">): Promise<DadosEmpresaPdf> {
  let logo: DadosEmpresaPdf["logo"] = null;
  if (empresa.logo_path) {
    const { data } = await supabase.storage.from("empresa").download(empresa.logo_path);
    if (data) {
      const formato = /\.png$/i.test(empresa.logo_path) ? "png" : "jpg";
      logo = { data: Buffer.from(await data.arrayBuffer()), format: formato };
    }
  }
  return { ...empresa, logo };
}

function detalheMedidas(medidas: unknown, area: number | null): string | null {
  if (!Array.isArray(medidas) || medidas.length === 0) return null;
  const partes = (medidas as { descricao?: string; largura_m: number; altura_m: number; quantidade: number }[]).map(
    (m) => `${m.descricao ? `${m.descricao} ` : ""}${m.largura_m.toLocaleString("pt-BR")}×${m.altura_m.toLocaleString("pt-BR")} m${m.quantidade > 1 ? ` (×${m.quantidade})` : ""}`,
  );
  return `${partes.join("; ")} — total ${Number(area ?? 0).toLocaleString("pt-BR")} m²`;
}

function enderecoCliente(c: Tabela<"clientes">): string | null {
  const linha = [c.logradouro, c.numero, c.bairro, c.cidade && `${c.cidade}/${c.uf ?? ""}`].filter(Boolean).join(", ");
  return linha || null;
}

/** PDF do orçamento. A consulta é feita com o cliente recebido (RLS do usuário ou chave de serviço + filtro). */
export async function pdfOrcamento(supabase: Cliente, filtro: { id?: string; token?: string }): Promise<{ buffer: Buffer; numero: number } | null> {
  let consulta = supabase
    .from("orcamentos")
    .select("*, clientes(*), veiculos(placa, marca, modelo, categorias_veiculo(nome)), orcamento_itens(*), empresas(*)")
    .is("deleted_at", null);
  if (filtro.id) consulta = consulta.eq("id", filtro.id);
  if (filtro.token) consulta = consulta.eq("token_publico", filtro.token);
  const { data: o } = await consulta.maybeSingle();
  if (!o || !o.empresas || !o.clientes) return null;
  const doc: DocumentoComercialPdf = {
    tipo: "orcamento",
    numero: o.numero,
    data: o.created_at,
    validade: o.validade,
    cliente: { nome: o.clientes.nome, cpf_cnpj: o.clientes.cpf_cnpj, telefone: o.clientes.whatsapp ?? o.clientes.telefone, email: o.clientes.email, endereco: enderecoCliente(o.clientes) },
    veiculo: o.veiculos ? { placa: o.veiculos.placa, descricao: [o.veiculos.marca, o.veiculos.modelo].filter(Boolean).join(" "), categoria: o.veiculos.categorias_veiculo?.nome } : null,
    itens: [...o.orcamento_itens].sort((a, b) => a.ordem - b.ordem).map((i) => ({ ...i, quantidade: Number(i.quantidade), detalhe: detalheMedidas(i.medidas, i.area_m2) })),
    subtotal_centavos: o.subtotal_centavos,
    desconto_centavos: o.desconto_itens_centavos + o.desconto_total_centavos,
    total_centavos: o.total_centavos,
    observacoes: o.observacoes,
  };
  const empresa = await dadosEmpresa(supabase, o.empresas);
  const buffer = await renderToBuffer(createElement(DocumentoComercial, { empresa, doc }) as Parameters<typeof renderToBuffer>[0]);
  return { buffer, numero: o.numero };
}

/** PDF da OS */
export async function pdfOS(supabase: Cliente, filtro: { id?: string; token?: string }): Promise<{ buffer: Buffer; numero: number } | null> {
  let consulta = supabase
    .from("ordens_servico")
    .select("*, clientes(*), veiculos(placa, marca, modelo, categorias_veiculo(nome)), os_itens(*), empresas(*), instalador:perfis!ordens_servico_instalador_id_fkey(nome)")
    .is("deleted_at", null);
  if (filtro.id) consulta = consulta.eq("id", filtro.id);
  if (filtro.token) consulta = consulta.eq("token_publico", filtro.token);
  const { data: o } = await consulta.maybeSingle();
  if (!o || !o.empresas || !o.clientes) return null;
  const doc: DocumentoComercialPdf = {
    tipo: "os",
    numero: o.numero,
    data: o.created_at,
    status: ROTULO_STATUS_OS[o.status],
    cliente: { nome: o.clientes.nome, cpf_cnpj: o.clientes.cpf_cnpj, telefone: o.clientes.whatsapp ?? o.clientes.telefone, email: o.clientes.email, endereco: enderecoCliente(o.clientes) },
    veiculo: o.veiculos ? { placa: o.veiculos.placa, descricao: [o.veiculos.marca, o.veiculos.modelo].filter(Boolean).join(" "), categoria: o.veiculos.categorias_veiculo?.nome, km: o.km } : null,
    itens: [...o.os_itens]
      .sort((a, b) => a.ordem - b.ordem)
      .map((i) => ({
        ...i,
        quantidade: Number(i.quantidade),
        detalhe: [detalheMedidas(i.medidas, i.area_m2), i.numeros_serie.length ? `Série: ${i.numeros_serie.join(", ")}` : null].filter(Boolean).join(" · ") || null,
      })),
    subtotal_centavos: o.subtotal_centavos,
    desconto_centavos: o.desconto_itens_centavos + o.desconto_total_centavos,
    total_centavos: o.total_centavos,
    observacoes: o.observacoes,
    instaladores: o.instalador?.nome ?? null,
    formaPagamento: o.forma_pagamento ? `${ROTULO_FORMA_PAGAMENTO[o.forma_pagamento]}${o.parcelas > 1 ? ` em ${o.parcelas}x` : ""}` : null,
  };
  const empresa = await dadosEmpresa(supabase, o.empresas);
  const buffer = await renderToBuffer(createElement(DocumentoComercial, { empresa, doc }) as Parameters<typeof renderToBuffer>[0]);
  return { buffer, numero: o.numero };
}

export function respostaPdf(buffer: Buffer, nome: string, baixar = false): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
