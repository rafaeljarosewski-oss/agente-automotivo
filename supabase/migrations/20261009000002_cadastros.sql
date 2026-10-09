-- =============================================================================
-- Cadastros: configurações fiscais, categorias, clientes, veículos e catálogo
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configuração fiscal da empresa (1:1)
-- -----------------------------------------------------------------------------
create table public.empresa_config_fiscal (
  empresa_id uuid primary key references public.empresas (id) on delete cascade,
  ambiente public.ambiente_fiscal not null default 'homologacao',
  -- NFS-e
  nfse_serie text not null default '1',
  nfse_proximo_numero bigint not null default 1,
  -- 'auto' consulta a API; 'nacional' = Sistema Nacional NFS-e (ADN); 'padrao' = provedor da prefeitura
  nfse_provedor text not null default 'auto' check (nfse_provedor in ('auto', 'nacional', 'padrao')),
  nfse_codigo_tributacao_municipal text,
  nfse_aliquota_iss numeric(5, 2),
  nfse_regime_especial integer,
  nfse_incentivo_fiscal boolean not null default false,
  -- NFC-e
  nfce_serie integer not null default 1,
  nfce_proximo_numero bigint not null default 1,
  nfce_csc_id integer,
  nfce_csc_cifrado text, -- CSC criptografado (AES-256-GCM) pela aplicação
  -- NF-e
  nfe_serie integer not null default 1,
  nfe_proximo_numero bigint not null default 1,
  natureza_operacao text not null default 'Venda de mercadoria',
  -- Reforma tributária (IBS/CBS) — valores informativos em 2026
  informar_ibs_cbs boolean not null default false,
  aliquota_ibs_uf numeric(7, 4) not null default 0.1000,
  aliquota_ibs_mun numeric(7, 4) not null default 0.0000,
  aliquota_cbs numeric(7, 4) not null default 0.9000,
  -- Certificado digital A1 (o arquivo e a senha NÃO são armazenados aqui)
  certificado_enviado_em timestamptz,
  certificado_validade timestamptz,
  certificado_titular text,
  certificado_serial text,
  -- Integração com a API fiscal
  empresa_cadastrada_api boolean not null default false,
  ultima_sincronizacao_api timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

select public.aplicar_gatilhos_padrao('public.empresa_config_fiscal');

-- -----------------------------------------------------------------------------
-- Categorias de veículo (Hatch, Sedan, SUV...)
-- -----------------------------------------------------------------------------
create table public.categorias_veiculo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);

create unique index categorias_veiculo_nome_uq on public.categorias_veiculo (empresa_id, lower(nome)) where deleted_at is null;
select public.aplicar_gatilhos_padrao('public.categorias_veiculo', true);

-- -----------------------------------------------------------------------------
-- Categorias financeiras (contas a pagar / receitas)
-- -----------------------------------------------------------------------------
create table public.categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  nome text not null,
  tipo text not null default 'despesa' check (tipo in ('receita', 'despesa')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);

create unique index categorias_financeiras_nome_uq on public.categorias_financeiras (empresa_id, tipo, lower(nome)) where deleted_at is null;
select public.aplicar_gatilhos_padrao('public.categorias_financeiras', true);

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  tipo_pessoa public.tipo_pessoa not null default 'PF',
  nome text not null, -- nome completo (PF) ou razão social (PJ)
  nome_fantasia text,
  cpf_cnpj text,
  inscricao_estadual text,
  email text,
  telefone text,
  whatsapp text,
  data_nascimento date,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf char(2),
  codigo_municipio text,
  observacoes text,
  aceita_mensagens boolean not null default true, -- porta aberta para lembretes de pós-venda (Fase 2)
  busca text generated always as (
    public.normalizar_busca(coalesce(nome, '') || ' ' || coalesce(nome_fantasia, '') || ' ' || coalesce(email, ''))
  ) stored,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  constraint clientes_cpf_cnpj_formato check (cpf_cnpj is null or cpf_cnpj ~ '^([0-9]{11}|[0-9A-Z]{12}[0-9]{2})$')
);

create unique index clientes_cpf_cnpj_uq on public.clientes (empresa_id, cpf_cnpj) where deleted_at is null and cpf_cnpj is not null;
create index clientes_empresa_idx on public.clientes (empresa_id) where deleted_at is null;
create index clientes_busca_trgm on public.clientes using gin (busca extensions.gin_trgm_ops);
create index clientes_telefone_idx on public.clientes (empresa_id, telefone);
create index clientes_whatsapp_idx on public.clientes (empresa_id, whatsapp);
select public.aplicar_gatilhos_padrao('public.clientes', true);

-- -----------------------------------------------------------------------------
-- Veículos
-- -----------------------------------------------------------------------------
create table public.veiculos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id),
  placa text not null,
  marca text,
  modelo text not null,
  ano_fabricacao integer,
  ano_modelo integer,
  cor text,
  categoria_id uuid references public.categorias_veiculo (id),
  chassi text,
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  constraint veiculos_placa_formato check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$')
);

create unique index veiculos_placa_uq on public.veiculos (empresa_id, placa) where deleted_at is null;
create index veiculos_cliente_idx on public.veiculos (cliente_id);
select public.aplicar_gatilhos_padrao('public.veiculos', true);

-- -----------------------------------------------------------------------------
-- Produtos (estoque por unidade ou por metro)
-- -----------------------------------------------------------------------------
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  codigo text,
  codigo_barras text,
  nome text not null,
  descricao text,
  categoria text not null default 'acessorio'
    check (categoria in ('pelicula', 'lampada', 'alarme', 'acessorio', 'ar_condicionado', 'som', 'outro')),
  marca text,
  tipo_controle public.tipo_controle_estoque not null default 'unidade',
  unidade text not null default 'UN',
  exige_numero_serie boolean not null default false,
  preco_venda_centavos bigint not null default 0 check (preco_venda_centavos >= 0),
  custo_centavos bigint not null default 0 check (custo_centavos >= 0),
  estoque_atual numeric(14, 3) not null default 0,
  estoque_minimo numeric(14, 3) not null default 0,
  largura_rolo_m numeric(6, 3), -- película em rolo: largura útil (m)
  garantia_dias integer, -- porta aberta para controle de garantia (Fase 2)
  ativo boolean not null default true,
  -- Dados fiscais (NF-e / NFC-e)
  ncm text,
  cest text,
  cfop text,
  origem integer not null default 0 check (origem between 0 and 8),
  csosn text,
  cst_icms text,
  cst_pis text,
  cst_cofins text,
  -- Reforma tributária
  cst_ibs_cbs text,
  cclass_trib text,
  fiscal_validado boolean not null default false,
  busca text generated always as (
    public.normalizar_busca(coalesce(nome, '') || ' ' || coalesce(codigo, '') || ' ' || coalesce(codigo_barras, '') || ' ' || coalesce(marca, ''))
  ) stored,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  constraint produtos_serie_somente_unidade check (not exige_numero_serie or tipo_controle = 'unidade')
);

create unique index produtos_codigo_uq on public.produtos (empresa_id, codigo) where deleted_at is null and codigo is not null;
create index produtos_empresa_idx on public.produtos (empresa_id) where deleted_at is null;
create index produtos_busca_trgm on public.produtos using gin (busca extensions.gin_trgm_ops);
select public.aplicar_gatilhos_padrao('public.produtos', true);

-- Códigos dos fornecedores (para casar itens do XML de compra)
create table public.produto_codigos_fornecedor (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete cascade,
  fornecedor_cnpj text not null,
  codigo_fornecedor text not null,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint produto_codigos_fornecedor_uq unique (empresa_id, fornecedor_cnpj, codigo_fornecedor)
);

select public.aplicar_gatilhos_padrao('public.produto_codigos_fornecedor');

-- -----------------------------------------------------------------------------
-- Serviços
-- -----------------------------------------------------------------------------
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  codigo text,
  nome text not null,
  descricao text,
  categoria text not null default 'outro'
    check (categoria in ('pelicula_automotiva', 'pelicula_residencial', 'instalacao', 'ar_condicionado', 'eletrica', 'estetica', 'outro')),
  tipo_preco public.tipo_preco_servico not null default 'fixo',
  preco_centavos bigint not null default 0 check (preco_centavos >= 0), -- preço fixo ou preço por m²
  produto_consumo_id uuid references public.produtos (id), -- película residencial consumida (por metro)
  perda_percentual numeric(5, 2) not null default 10, -- margem de perda no corte da película residencial
  comissao_tipo public.tipo_comissao not null default 'nenhuma',
  comissao_percentual numeric(5, 2) not null default 0 check (comissao_percentual between 0 and 100),
  comissao_fixo_centavos bigint not null default 0 check (comissao_fixo_centavos >= 0),
  tempo_estimado_min integer,
  garantia_dias integer,
  ativo boolean not null default true,
  -- Dados fiscais (NFS-e)
  codigo_servico text, -- item da LC 116 / código de tributação nacional (cTribNac)
  codigo_tributacao_municipal text,
  codigo_nbs text,
  aliquota_iss numeric(5, 2),
  -- Reforma tributária
  cst_ibs_cbs text,
  cclass_trib text,
  fiscal_validado boolean not null default false,
  busca text generated always as (
    public.normalizar_busca(coalesce(nome, '') || ' ' || coalesce(codigo, ''))
  ) stored,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);

create index servicos_empresa_idx on public.servicos (empresa_id) where deleted_at is null;
select public.aplicar_gatilhos_padrao('public.servicos', true);

create table public.servico_precos_categoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  servico_id uuid not null references public.servicos (id) on delete cascade,
  categoria_id uuid not null references public.categorias_veiculo (id) on delete cascade,
  preco_centavos bigint not null check (preco_centavos >= 0),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint servico_precos_categoria_uq unique (servico_id, categoria_id)
);

select public.aplicar_gatilhos_padrao('public.servico_precos_categoria');

-- -----------------------------------------------------------------------------
-- Linhas de película e tabela de preços (linha × categoria)
-- -----------------------------------------------------------------------------
create table public.linhas_pelicula (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  nome text not null,
  marca text,
  descricao text,
  produto_id uuid references public.produtos (id), -- rolo consumido (produto controlado por metro)
  servico_id uuid references public.servicos (id), -- serviço usado para dados fiscais e comissão
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);

create unique index linhas_pelicula_nome_uq on public.linhas_pelicula (empresa_id, lower(nome)) where deleted_at is null;
select public.aplicar_gatilhos_padrao('public.linhas_pelicula', true);

create table public.tabela_precos_pelicula (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  linha_id uuid not null references public.linhas_pelicula (id) on delete cascade,
  categoria_id uuid not null references public.categorias_veiculo (id) on delete cascade,
  preco_centavos bigint not null check (preco_centavos >= 0),
  consumo_metros numeric(8, 3) not null default 0 check (consumo_metros >= 0),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint tabela_precos_pelicula_uq unique (linha_id, categoria_id)
);

select public.aplicar_gatilhos_padrao('public.tabela_precos_pelicula');

-- -----------------------------------------------------------------------------
-- Inicialização de uma nova empresa (dados padrão)
-- -----------------------------------------------------------------------------
create or replace function public.tg_inicializar_empresa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.empresa_config_fiscal (empresa_id, informar_ibs_cbs)
  values (new.id, new.regime_tributario = 'normal');

  insert into public.categorias_veiculo (empresa_id, nome, ordem)
  values (new.id, 'Hatch', 1), (new.id, 'Sedan', 2), (new.id, 'SUV', 3), (new.id, 'Caminhonete', 4), (new.id, 'Utilitário', 5);

  insert into public.categorias_financeiras (empresa_id, nome, tipo)
  values
    (new.id, 'Fornecedores de material', 'despesa'),
    (new.id, 'Aluguel', 'despesa'),
    (new.id, 'Energia elétrica', 'despesa'),
    (new.id, 'Água', 'despesa'),
    (new.id, 'Internet e telefone', 'despesa'),
    (new.id, 'Salários e comissões', 'despesa'),
    (new.id, 'Impostos', 'despesa'),
    (new.id, 'Marketing', 'despesa'),
    (new.id, 'Manutenção', 'despesa'),
    (new.id, 'Outras despesas', 'despesa'),
    (new.id, 'Serviços', 'receita'),
    (new.id, 'Venda de produtos', 'receita');
  return new;
end;
$$;

create trigger empresas_inicializar
after insert on public.empresas
for each row execute function public.tg_inicializar_empresa();
