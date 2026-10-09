"use server";

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
