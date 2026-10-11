"use server";

import { z } from "zod";
import { executarAcao, verificar } from "@/lib/servidor/acao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { placa as schemaPlaca, telefoneOpcional, textoObrigatorio, textoOpcional, uuidOpcional } from "@/lib/validacao/comum";
import { consultarCEP, consultarCNPJ, type EmpresaConsultada, type EnderecoConsultado } from "@/lib/servidor/consultas-externas";
import { obterSessao } from "@/lib/servidor/sessao";
import { falha, sucesso, type Resultado } from "@/lib/servidor/resultado";

export async function buscarCEP(cep: string): Promise<Resultado<EnderecoConsultado>> {
  if (!(await obterSessao())) return falha("Sessão expirada.");
  const r = await consultarCEP(cep);
  return r ? sucesso(r) : falha("CEP não encontrado. Preencha o endereço manualmente.");
}

export async function buscarCNPJ(cnpj: string): Promise<Resultado<EmpresaConsultada>> {
  if (!(await obterSessao())) return falha("Sessão expirada.");
  const r = await consultarCNPJ(cnpj);
  return r ? sucesso(r) : falha("Não foi possível consultar este CNPJ agora. Preencha os dados manualmente.");
}

// ---------------------------------------------------------------------------
// Seleção rápida de cliente e veículo (orçamento e OS)
// ---------------------------------------------------------------------------

export interface ClienteResumo {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  whatsapp: string | null;
  telefone: string | null;
  placas: string | null;
}

export interface VeiculoResumo {
  id: string;
  placa: string;
  marca: string | null;
  modelo: string;
  categoria_id: string | null;
}

export async function pesquisarClientes(termo: string): Promise<Resultado<ClienteResumo[]>> {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil.papel === "instalador") return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("buscar_clientes", { p_termo: termo, p_limite: 15 });
  if (error) return falha("Não foi possível buscar clientes.");
  return sucesso(data ?? []);
}

export async function listarVeiculosCliente(clienteId: string): Promise<Resultado<VeiculoResumo[]>> {
  const sessao = await obterSessao();
  if (!sessao) return falha("Sessão expirada.");
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("veiculos")
    .select("id, placa, marca, modelo, categoria_id")
    .eq("cliente_id", clienteId)
    .is("deleted_at", null)
    .order("created_at");
  return sucesso(data ?? []);
}

const schemaRapido = z.object({
  nome: textoObrigatorio("o nome do cliente"),
  whatsapp: telefoneOpcional,
  placa: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null),
  marca: textoOpcional,
  modelo: textoOpcional,
  categoria_id: uuidOpcional,
});

/** Cadastro rápido de cliente (e veículo) direto do orçamento/OS */
export async function criarClienteRapido(entrada: z.input<typeof schemaRapido>) {
  return executarAcao({ papeis: ["admin", "atendente"], schema: schemaRapido, entrada }, async (d, { supabase }) => {
    let placaNormalizada: string | null = null;
    if (d.placa) {
      const p = schemaPlaca.safeParse(d.placa);
      if (!p.success) return falha("Placa inválida. Use ABC-1234 ou ABC1D23.", { placa: "Placa inválida." });
      if (!d.modelo) return falha("Informe o modelo do veículo.", { modelo: "Informe o modelo." });
      placaNormalizada = p.data;
    }
    const cliente = verificar(await supabase.from("clientes").insert({ nome: d.nome, whatsapp: d.whatsapp }).select("id, nome, cpf_cnpj, whatsapp, telefone").single());
    let veiculo: VeiculoResumo | null = null;
    if (placaNormalizada) {
      veiculo = verificar(
        await supabase
          .from("veiculos")
          .insert({ cliente_id: cliente.id, placa: placaNormalizada, marca: d.marca, modelo: d.modelo!, categoria_id: d.categoria_id })
          .select("id, placa, marca, modelo, categoria_id")
          .single(),
      );
    }
    return sucesso({ cliente: { ...cliente, placas: placaNormalizada }, veiculo }, "Cliente cadastrado.");
  });
}
