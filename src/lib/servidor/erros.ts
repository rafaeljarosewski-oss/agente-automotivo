/**
 * Traduz erros do Postgres/PostgREST/Supabase para mensagens em português simples.
 */

interface ErroBanco {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

const CONSTRAINTS: Record<string, string> = {
  clientes_cpf_cnpj_uq: "Já existe um cliente com este CPF/CNPJ.",
  veiculos_placa_uq: "Já existe um veículo com esta placa.",
  produtos_codigo_uq: "Já existe um produto com este código.",
  categorias_veiculo_nome_uq: "Já existe uma categoria com este nome.",
  linhas_pelicula_nome_uq: "Já existe uma linha de película com este nome.",
  tabela_precos_pelicula_uq: "Esta combinação de linha e categoria já tem preço.",
  servico_precos_categoria_uq: "Esta categoria já tem preço para o serviço.",
  numeros_serie_uq: "Este número de série já está cadastrado para o produto.",
  caixas_um_aberto_uq: "Já existe um caixa aberto.",
  empresas_cnpj_unico: "Já existe uma empresa com este CNPJ.",
  notas_compra_chave_uq: "Esta nota de compra já foi importada.",
  ordens_servico_orcamento_uq: "Este orçamento já gerou uma OS.",
  produto_codigos_fornecedor_uq: "Este código de fornecedor já está vinculado a um produto.",
  veiculos_placa_formato: "Placa inválida. Use o padrão antigo (ABC-1234) ou Mercosul (ABC1D23).",
  clientes_cpf_cnpj_formato: "CPF/CNPJ inválido.",
  empresas_cnpj_formato: "CNPJ inválido.",
};

export function traduzirErro(erro: unknown): string {
  if (!erro) return "Erro desconhecido.";
  if (typeof erro === "string") return erro;
  const e = erro as ErroBanco;
  const msg = e.message ?? "";

  for (const [constraint, texto] of Object.entries(CONSTRAINTS)) {
    if (msg.includes(constraint) || e.details?.includes(constraint)) return texto;
  }

  switch (e.code) {
    case "23505":
      return "Já existe um registro com estes dados.";
    case "23503":
      return "Este registro está vinculado a outros dados e não pode ser alterado/excluído.";
    case "23502":
      return "Preencha todos os campos obrigatórios.";
    case "23514":
      return "Algum valor informado não é válido.";
    case "42501":
      return msg && !msg.includes("row-level security") ? msg : "Você não tem permissão para esta ação.";
    case "PGRST116":
      return "Registro não encontrado.";
    case "P0001":
    case "P0002":
      return msg; // mensagens de RAISE EXCEPTION já estão em português
  }

  if (msg.includes("row-level security")) return "Você não tem permissão para esta ação.";
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed")) return "E-mail ainda não confirmado.";
  if (msg.includes("User already registered") || msg.includes("already been registered")) return "Já existe um usuário com este e-mail.";
  if (msg.includes("Password should be")) return "A senha deve ter pelo menos 8 caracteres.";
  if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) return "Não foi possível conectar ao servidor. Tente novamente.";
  return msg || "Não foi possível concluir a operação.";
}
