-- =============================================================================
-- Notas fiscais e financeiro
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Notas fiscais emitidas (NFS-e, NFC-e, NF-e)
-- -----------------------------------------------------------------------------
create table public.notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  os_id uuid references public.ordens_servico (id),
  cliente_id uuid references public.clientes (id),
  tipo public.tipo_nota not null,
  status public.status_nota not null default 'rascunho',
  ambiente public.ambiente_fiscal not null,
  provedor text not null, -- 'mock', 'acbr', 'nuvemfiscal'...
  provedor_id text, -- ID do documento na API fiscal
  referencia text not null, -- identificador idempotente enviado à API
  nfse_provedor text, -- 'nacional' ou 'padrao' (somente NFS-e)
  numero text,
  serie text,
  chave text,
  protocolo text,
  codigo_verificacao text,
  link_url text,
  data_emissao timestamptz,
  valor_total_centavos bigint not null default 0,
  valor_ibs_centavos bigint not null default 0,
  valor_cbs_centavos bigint not null default 0,
  codigo_rejeicao text,
  motivo_rejeicao text, -- mensagem original da SEFAZ / prefeitura
  motivo_amigavel text, -- mensagem traduzida para linguagem simples
  mensagens jsonb,
  payload jsonb, -- último pedido enviado
  resposta jsonb, -- última resposta recebida
  xml_path text,
  pdf_path text,
  token_publico text not null default public.gerar_token(),
  tentativas integer not null default 0,
  proxima_sincronizacao timestamptz,
  ultima_sincronizacao timestamptz,
  cancelada_em timestamptz,
  motivo_cancelamento text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint notas_fiscais_referencia_uq unique (empresa_id, referencia),
  constraint notas_fiscais_token_uq unique (token_publico)
);

create index notas_fiscais_os_idx on public.notas_fiscais (os_id);
create index notas_fiscais_status_idx on public.notas_fiscais (empresa_id, status);
create index notas_fiscais_sync_idx on public.notas_fiscais (proxima_sincronizacao) where status = 'processando';
create unique index notas_fiscais_provedor_uq on public.notas_fiscais (provedor, provedor_id) where provedor_id is not null;
select public.aplicar_gatilhos_padrao('public.notas_fiscais');

create table public.nota_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  nota_id uuid not null references public.notas_fiscais (id) on delete cascade,
  os_item_id uuid references public.os_itens (id),
  numero_item integer not null,
  codigo text,
  descricao text not null,
  quantidade numeric(12, 3) not null,
  unidade text not null default 'UN',
  valor_unitario_centavos bigint not null,
  desconto_centavos bigint not null default 0,
  valor_total_centavos bigint not null,
  -- produto
  ncm text,
  cfop text,
  origem integer,
  csosn text,
  cst_icms text,
  -- serviço
  codigo_servico text,
  codigo_tributacao_municipal text,
  aliquota_iss numeric(5, 2),
  -- reforma tributária
  cst_ibs_cbs text,
  cclass_trib text,
  aliquota_ibs_uf numeric(7, 4),
  aliquota_ibs_mun numeric(7, 4),
  aliquota_cbs numeric(7, 4),
  valor_ibs_centavos bigint not null default 0,
  valor_cbs_centavos bigint not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index nota_itens_nota_idx on public.nota_itens (nota_id);
select public.aplicar_gatilhos_padrao('public.nota_itens');

-- Eventos da nota: cancelamento e carta de correção
create table public.notas_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  nota_id uuid not null references public.notas_fiscais (id) on delete cascade,
  tipo text not null check (tipo in ('cancelamento', 'carta_correcao')),
  sequencia integer not null default 1,
  status text not null default 'pendente' check (status in ('pendente', 'registrado', 'rejeitado', 'erro')),
  texto text not null, -- justificativa ou correção
  provedor_id text,
  protocolo text,
  mensagem text,
  xml_path text,
  pdf_path text,
  resposta jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index notas_eventos_nota_idx on public.notas_eventos (nota_id);
select public.aplicar_gatilhos_padrao('public.notas_eventos');

-- Webhooks recebidos da API fiscal (tabela de sistema: somente service role)
create table public.fiscal_webhook_eventos (
  id uuid primary key default gen_random_uuid(),
  provedor text not null,
  recebido_em timestamptz not null default now(),
  assinatura_valida boolean not null,
  payload jsonb,
  nota_id uuid references public.notas_fiscais (id) on delete set null,
  processado_em timestamptz,
  erro text
);

-- -----------------------------------------------------------------------------
-- Financeiro: caixa
-- -----------------------------------------------------------------------------
create table public.caixas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  aberto_em timestamptz not null default now(),
  aberto_por uuid default auth.uid(),
  valor_abertura_centavos bigint not null default 0 check (valor_abertura_centavos >= 0),
  fechado_em timestamptz,
  fechado_por uuid,
  conferencia jsonb, -- {forma: {esperado, informado, diferenca}}
  diferenca_centavos bigint,
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create unique index caixas_um_aberto_uq on public.caixas (empresa_id) where status = 'aberto';
select public.aplicar_gatilhos_padrao('public.caixas');

-- -----------------------------------------------------------------------------
-- Contas a receber (títulos/parcelas)
-- -----------------------------------------------------------------------------
create table public.contas_receber (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  os_id uuid references public.ordens_servico (id),
  cliente_id uuid references public.clientes (id),
  descricao text not null,
  forma_pagamento public.forma_pagamento, -- prevista (null = definir na baixa)
  parcela integer not null default 1,
  total_parcelas integer not null default 1,
  valor_centavos bigint not null check (valor_centavos > 0),
  vencimento date not null,
  status public.status_titulo not null default 'aberto',
  pago_em timestamptz,
  valor_pago_centavos bigint,
  forma_pagamento_baixa public.forma_pagamento,
  caixa_id uuid references public.caixas (id),
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint contas_receber_parcela check (parcela between 1 and total_parcelas)
);

create index contas_receber_venc_idx on public.contas_receber (empresa_id, status, vencimento);
create index contas_receber_os_idx on public.contas_receber (os_id);
select public.aplicar_gatilhos_padrao('public.contas_receber');

-- -----------------------------------------------------------------------------
-- Contas a pagar
-- -----------------------------------------------------------------------------
create table public.contas_pagar (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  categoria_id uuid references public.categorias_financeiras (id),
  fornecedor text,
  descricao text not null,
  documento text,
  valor_centavos bigint not null check (valor_centavos > 0),
  vencimento date not null,
  status public.status_titulo not null default 'aberto',
  pago_em timestamptz,
  valor_pago_centavos bigint,
  forma_pagamento public.forma_pagamento,
  caixa_id uuid references public.caixas (id),
  nota_compra_id uuid references public.notas_compra (id),
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);

create index contas_pagar_venc_idx on public.contas_pagar (empresa_id, status, vencimento) where deleted_at is null;
select public.aplicar_gatilhos_padrao('public.contas_pagar', true);

-- Movimentos do caixa
create table public.caixa_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  caixa_id uuid not null references public.caixas (id),
  tipo public.tipo_mov_caixa not null,
  forma_pagamento public.forma_pagamento not null default 'dinheiro',
  valor_centavos bigint not null check (valor_centavos > 0),
  descricao text,
  conta_receber_id uuid references public.contas_receber (id),
  conta_pagar_id uuid references public.contas_pagar (id),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index caixa_movimentos_caixa_idx on public.caixa_movimentos (caixa_id);
select public.aplicar_gatilhos_padrao('public.caixa_movimentos');

create trigger caixa_movimentos_imutaveis
before update or delete on public.caixa_movimentos
for each row execute function public.tg_bloquear_alteracao();
