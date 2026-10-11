-- =============================================================================
-- Operação: estoque, orçamentos, ordens de serviço e comissões
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Estoque
-- -----------------------------------------------------------------------------
create table public.notas_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  chave text,
  numero text,
  serie text,
  fornecedor_cnpj text,
  fornecedor_nome text,
  data_emissao timestamptz,
  valor_total_centavos bigint not null default 0,
  xml_path text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create unique index notas_compra_chave_uq on public.notas_compra (empresa_id, chave) where chave is not null;
select public.aplicar_gatilhos_padrao('public.notas_compra');

create table public.rolos_pelicula (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  produto_id uuid not null references public.produtos (id),
  identificacao text, -- lote / etiqueta do rolo
  metragem_inicial numeric(10, 3) not null check (metragem_inicial > 0),
  saldo_metros numeric(10, 3) not null,
  ativo boolean not null default true,
  nota_compra_id uuid references public.notas_compra (id),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index rolos_pelicula_produto_idx on public.rolos_pelicula (produto_id) where ativo;
select public.aplicar_gatilhos_padrao('public.rolos_pelicula');

create table public.numeros_serie (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  produto_id uuid not null references public.produtos (id),
  numero text not null,
  status text not null default 'disponivel' check (status in ('disponivel', 'vendido', 'defeito')),
  os_item_id uuid, -- preenchido na saída (FK adicionada após a criação de os_itens)
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint numeros_serie_uq unique (empresa_id, produto_id, numero)
);

select public.aplicar_gatilhos_padrao('public.numeros_serie');

create table public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  produto_id uuid not null references public.produtos (id),
  rolo_id uuid references public.rolos_pelicula (id),
  tipo public.tipo_movimento_estoque not null,
  quantidade numeric(14, 3) not null, -- variação com sinal: positivo entra, negativo sai
  saldo_apos numeric(14, 3),
  custo_unitario_centavos bigint,
  motivo text,
  os_id uuid,
  os_item_id uuid,
  nota_compra_id uuid references public.notas_compra (id),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint movimentacoes_quantidade_nao_zero check (quantidade <> 0),
  constraint movimentacoes_sinal check (
    (tipo = 'entrada' and quantidade > 0) or (tipo = 'saida' and quantidade < 0) or tipo = 'ajuste'
  ),
  constraint movimentacoes_ajuste_motivo check (tipo <> 'ajuste' or coalesce(trim(motivo), '') <> '')
);

create index movimentacoes_produto_idx on public.movimentacoes_estoque (produto_id, created_at desc);
select public.aplicar_gatilhos_padrao('public.movimentacoes_estoque');

-- Atualiza saldo do produto (e do rolo) a cada movimentação
create or replace function public.tg_movimentacao_saldo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo numeric(14, 3);
begin
  if new.rolo_id is not null then
    update public.rolos_pelicula
      set saldo_metros = saldo_metros + new.quantidade,
          ativo = (saldo_metros + new.quantidade) > 0
      where id = new.rolo_id and empresa_id = new.empresa_id;
  end if;

  update public.produtos
    set estoque_atual = estoque_atual + new.quantidade
    where id = new.produto_id and empresa_id = new.empresa_id
    returning estoque_atual into v_saldo;

  if v_saldo is null then
    raise exception 'Produto não encontrado para esta empresa.';
  end if;

  new.saldo_apos := v_saldo;
  return new;
end;
$$;

create trigger movimentacoes_saldo
before insert on public.movimentacoes_estoque
for each row execute function public.tg_movimentacao_saldo();

-- Movimentações são um livro-razão: não podem ser alteradas nem apagadas
create or replace function public.tg_bloquear_alteracao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Registros de movimentação não podem ser alterados ou excluídos. Faça um ajuste.';
end;
$$;

create trigger movimentacoes_imutaveis
before update or delete on public.movimentacoes_estoque
for each row execute function public.tg_bloquear_alteracao();

-- -----------------------------------------------------------------------------
-- Orçamentos
-- -----------------------------------------------------------------------------
create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  numero bigint not null,
  cliente_id uuid not null references public.clientes (id),
  veiculo_id uuid references public.veiculos (id),
  status public.status_orcamento not null default 'rascunho',
  validade date not null default (current_date + 7),
  observacoes text,
  subtotal_centavos bigint not null default 0,
  desconto_itens_centavos bigint not null default 0,
  desconto_total_centavos bigint not null default 0, -- desconto aplicado sobre o total
  total_centavos bigint not null default 0,
  token_publico text not null default public.gerar_token(),
  enviado_em timestamptz,
  aprovado_em timestamptz,
  recusado_em timestamptz,
  motivo_recusa text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  constraint orcamentos_numero_uq unique (empresa_id, numero),
  constraint orcamentos_token_uq unique (token_publico),
  constraint orcamentos_totais check (total_centavos >= 0 and desconto_total_centavos >= 0)
);

create index orcamentos_cliente_idx on public.orcamentos (cliente_id);
create index orcamentos_status_idx on public.orcamentos (empresa_id, status) where deleted_at is null;
select public.aplicar_gatilhos_padrao('public.orcamentos', true);

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  ordem integer not null default 0,
  tipo public.tipo_item not null,
  servico_id uuid references public.servicos (id),
  produto_id uuid references public.produtos (id),
  linha_pelicula_id uuid references public.linhas_pelicula (id),
  descricao text not null,
  quantidade numeric(12, 3) not null default 1 check (quantidade > 0),
  unidade text not null default 'UN',
  preco_unitario_centavos bigint not null default 0 check (preco_unitario_centavos >= 0),
  desconto_centavos bigint not null default 0 check (desconto_centavos >= 0),
  total_centavos bigint not null default 0 check (total_centavos >= 0),
  medidas jsonb, -- [{descricao, largura_m, altura_m, quantidade}] para película residencial
  area_m2 numeric(12, 4),
  consumo_metros numeric(12, 3), -- consumo previsto de película (baixa de estoque)
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint orcamento_itens_referencia check (
    (tipo = 'servico' and servico_id is not null) or (tipo = 'produto' and produto_id is not null)
  )
);

create index orcamento_itens_orcamento_idx on public.orcamento_itens (orcamento_id);
select public.aplicar_gatilhos_padrao('public.orcamento_itens');

-- -----------------------------------------------------------------------------
-- Ordens de serviço
-- -----------------------------------------------------------------------------
create table public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  numero bigint not null,
  orcamento_id uuid references public.orcamentos (id),
  cliente_id uuid not null references public.clientes (id),
  veiculo_id uuid references public.veiculos (id),
  status public.status_os not null default 'aberta',
  instalador_id uuid references public.perfis (id), -- responsável pela OS inteira
  previsao_entrega timestamptz, -- porta aberta para a agenda de instalações (Fase 2)
  km integer,
  observacoes text,
  observacoes_internas text,
  subtotal_centavos bigint not null default 0,
  desconto_itens_centavos bigint not null default 0,
  desconto_total_centavos bigint not null default 0,
  total_centavos bigint not null default 0,
  forma_pagamento public.forma_pagamento,
  parcelas integer not null default 1 check (parcelas between 1 and 24),
  token_publico text not null default public.gerar_token(),
  iniciada_em timestamptz,
  concluida_em timestamptz,
  concluida_por uuid,
  entregue_em timestamptz,
  cancelada_em timestamptz,
  motivo_cancelamento text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  constraint ordens_servico_numero_uq unique (empresa_id, numero),
  constraint ordens_servico_token_uq unique (token_publico),
  constraint ordens_servico_totais check (total_centavos >= 0 and desconto_total_centavos >= 0)
);

create index ordens_servico_status_idx on public.ordens_servico (empresa_id, status) where deleted_at is null;
create index ordens_servico_veiculo_idx on public.ordens_servico (veiculo_id);
create index ordens_servico_cliente_idx on public.ordens_servico (cliente_id);
create index ordens_servico_instalador_idx on public.ordens_servico (instalador_id);
create unique index ordens_servico_orcamento_uq on public.ordens_servico (orcamento_id) where orcamento_id is not null and deleted_at is null;
select public.aplicar_gatilhos_padrao('public.ordens_servico', true);

create table public.os_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  os_id uuid not null references public.ordens_servico (id) on delete cascade,
  ordem integer not null default 0,
  tipo public.tipo_item not null,
  servico_id uuid references public.servicos (id),
  produto_id uuid references public.produtos (id),
  linha_pelicula_id uuid references public.linhas_pelicula (id),
  descricao text not null,
  quantidade numeric(12, 3) not null default 1 check (quantidade > 0),
  unidade text not null default 'UN',
  preco_unitario_centavos bigint not null default 0 check (preco_unitario_centavos >= 0),
  desconto_centavos bigint not null default 0 check (desconto_centavos >= 0),
  total_centavos bigint not null default 0 check (total_centavos >= 0),
  medidas jsonb,
  area_m2 numeric(12, 4),
  consumo_metros numeric(12, 3),
  instalador_id uuid references public.perfis (id), -- responsável por este item (sobrepõe o da OS)
  numeros_serie text[] not null default '{}',
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint os_itens_referencia check (
    (tipo = 'servico' and servico_id is not null) or (tipo = 'produto' and produto_id is not null)
  )
);

create index os_itens_os_idx on public.os_itens (os_id);
create index os_itens_instalador_idx on public.os_itens (instalador_id);
select public.aplicar_gatilhos_padrao('public.os_itens');

alter table public.numeros_serie
  add constraint numeros_serie_os_item_fk foreign key (os_item_id) references public.os_itens (id) on delete set null;
alter table public.movimentacoes_estoque
  add constraint movimentacoes_os_fk foreign key (os_id) references public.ordens_servico (id),
  add constraint movimentacoes_os_item_fk foreign key (os_item_id) references public.os_itens (id);

-- Histórico de status da OS
create table public.os_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  os_id uuid not null references public.ordens_servico (id) on delete cascade,
  status_anterior public.status_os,
  status_novo public.status_os not null,
  observacao text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create index os_historico_os_idx on public.os_historico (os_id, created_at);

-- -----------------------------------------------------------------------------
-- Comissões dos instaladores (geradas na conclusão da OS)
-- -----------------------------------------------------------------------------
create table public.comissoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  os_id uuid not null references public.ordens_servico (id) on delete cascade,
  os_item_id uuid references public.os_itens (id) on delete cascade,
  instalador_id uuid not null references public.perfis (id),
  base_centavos bigint not null default 0,
  valor_centavos bigint not null check (valor_centavos >= 0),
  competencia date not null default current_date,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  pago_em timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index comissoes_instalador_idx on public.comissoes (empresa_id, instalador_id, competencia);
select public.aplicar_gatilhos_padrao('public.comissoes');

-- -----------------------------------------------------------------------------
-- Anexos genéricos (porta aberta para checklist com fotos — Fase 2)
-- -----------------------------------------------------------------------------
create table public.anexos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas (id) on delete cascade,
  entidade text not null, -- 'os', 'veiculo', 'cliente'...
  entidade_id uuid not null,
  caminho text not null, -- caminho no Storage (bucket "empresa")
  nome_arquivo text,
  tipo_conteudo text,
  descricao text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);

create index anexos_entidade_idx on public.anexos (empresa_id, entidade, entidade_id);
select public.aplicar_gatilhos_padrao('public.anexos', true);
