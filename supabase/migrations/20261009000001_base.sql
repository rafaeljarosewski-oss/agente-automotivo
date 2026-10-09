-- =============================================================================
-- Base do sistema: extensões, tipos, multiempresa, perfis, auditoria e utilitários
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type public.papel_usuario as enum ('admin', 'atendente', 'instalador');
create type public.tipo_pessoa as enum ('PF', 'PJ');
create type public.regime_tributario as enum ('simples_nacional', 'simples_excesso', 'normal', 'mei');
create type public.ambiente_fiscal as enum ('homologacao', 'producao');
create type public.tipo_controle_estoque as enum ('unidade', 'metro');
create type public.tipo_preco_servico as enum ('fixo', 'categoria', 'm2', 'pelicula');
create type public.tipo_comissao as enum ('nenhuma', 'percentual', 'fixo');
create type public.tipo_item as enum ('servico', 'produto');
create type public.status_orcamento as enum ('rascunho', 'enviado', 'aprovado', 'recusado', 'expirado');
create type public.status_os as enum ('aberta', 'em_execucao', 'aguardando_peca', 'concluida', 'entregue', 'cancelada');
create type public.tipo_movimento_estoque as enum ('entrada', 'saida', 'ajuste');
create type public.tipo_nota as enum ('nfse', 'nfce', 'nfe');
create type public.status_nota as enum ('rascunho', 'processando', 'autorizada', 'rejeitada', 'cancelada', 'erro');
create type public.forma_pagamento as enum ('dinheiro', 'pix', 'debito', 'credito_vista', 'credito_parcelado', 'boleto');
create type public.status_titulo as enum ('aberto', 'pago', 'cancelado');
create type public.tipo_mov_caixa as enum ('abertura', 'sangria', 'reforco', 'recebimento', 'pagamento');

-- -----------------------------------------------------------------------------
-- Utilitários
-- -----------------------------------------------------------------------------

-- Remove tudo que não é dígito (CPF, CNPJ, telefone, CEP)
create or replace function public.somente_digitos(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '')
$$;

-- Normaliza texto para busca (minúsculas e sem acentos)
create or replace function public.normalizar_busca(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p, '')))
$$;

-- Token aleatório para links públicos (orçamento, OS, nota)
create or replace function public.gerar_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_')
$$;

-- -----------------------------------------------------------------------------
-- Empresas (oficinas clientes da Órion)
-- -----------------------------------------------------------------------------
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  cnpj text not null,
  inscricao_estadual text,
  inscricao_municipal text,
  regime_tributario public.regime_tributario not null default 'simples_nacional',
  cnae text,
  email text,
  telefone text,
  whatsapp text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf char(2),
  codigo_municipio text, -- código IBGE (7 dígitos)
  logo_path text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint empresas_cnpj_formato check (cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$'),
  constraint empresas_cnpj_unico unique (cnpj)
);

comment on table public.empresas is 'Oficinas que usam o sistema (multiempresa).';

-- -----------------------------------------------------------------------------
-- Perfis: vínculo entre usuário do Supabase Auth e a empresa, com o papel
-- (Fase 1: um usuário pertence a uma empresa)
-- -----------------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  papel public.papel_usuario not null default 'atendente',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index perfis_empresa_idx on public.perfis (empresa_id);

-- -----------------------------------------------------------------------------
-- Funções de contexto usadas pelas políticas de RLS
-- SECURITY DEFINER para evitar recursão de RLS ao consultar "perfis".
-- -----------------------------------------------------------------------------
create or replace function public.empresa_atual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.empresa_id
  from public.perfis p
  where p.id = (select auth.uid()) and p.ativo
$$;

create or replace function public.papel_atual()
returns public.papel_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.papel
  from public.perfis p
  where p.id = (select auth.uid()) and p.ativo
$$;

create or replace function public.tem_papel(variadic p_papeis public.papel_usuario[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.papel = any (p_papeis) from public.perfis p where p.id = (select auth.uid()) and p.ativo),
    false
  )
$$;

-- -----------------------------------------------------------------------------
-- Auditoria: preenche created_*/updated_* automaticamente
-- -----------------------------------------------------------------------------
create or replace function public.tg_auditoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_at := new.created_at;
    new.updated_by := coalesce(new.updated_by, new.created_by);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end;
$$;

-- Impede que um registro troque de empresa depois de criado
create or replace function public.tg_empresa_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.empresa_id is distinct from old.empresa_id then
    raise exception 'Não é permitido mover registros entre empresas.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Soft delete: registra quem excluiu
create or replace function public.tg_soft_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.deleted_by := coalesce(new.deleted_by, auth.uid());
  elsif new.deleted_at is null then
    new.deleted_by := null;
  end if;
  return new;
end;
$$;

-- Aplica os gatilhos padrão em uma tabela
create or replace function public.aplicar_gatilhos_padrao(p_tabela regclass, p_soft_delete boolean default false, p_multiempresa boolean default true)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_nome text := replace(p_tabela::text, 'public.', '');
begin
  execute format('create trigger %I before insert or update on %s for each row execute function public.tg_auditoria()',
    v_nome || '_auditoria', p_tabela);
  if p_multiempresa then
    execute format('create trigger %I before update on %s for each row execute function public.tg_empresa_imutavel()',
      v_nome || '_empresa_imutavel', p_tabela);
  end if;
  if p_soft_delete then
    execute format('create trigger %I before update on %s for each row execute function public.tg_soft_delete()',
      v_nome || '_soft_delete', p_tabela);
  end if;
end;
$$;

select public.aplicar_gatilhos_padrao('public.empresas', false, false);
select public.aplicar_gatilhos_padrao('public.perfis');

-- -----------------------------------------------------------------------------
-- Contadores sequenciais por empresa (número de orçamento, OS, notas)
-- -----------------------------------------------------------------------------
create table public.contadores (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  chave text not null,
  valor bigint not null default 0,
  primary key (empresa_id, chave)
);

create or replace function public.proximo_numero(p_empresa uuid, p_chave text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v bigint;
begin
  -- Só a própria empresa (ou o service role, que não tem auth.uid()) pode avançar o contador
  if auth.uid() is not null and p_empresa is distinct from public.empresa_atual() then
    raise exception 'Acesso negado ao contador de outra empresa.' using errcode = '42501';
  end if;
  insert into public.contadores (empresa_id, chave, valor)
  values (p_empresa, p_chave, 1)
  on conflict (empresa_id, chave) do update set valor = public.contadores.valor + 1
  returning valor into v;
  return v;
end;
$$;

revoke execute on function public.proximo_numero(uuid, text) from public, anon;
grant execute on function public.proximo_numero(uuid, text) to authenticated, service_role;
