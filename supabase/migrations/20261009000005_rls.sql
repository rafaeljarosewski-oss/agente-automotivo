-- =============================================================================
-- Row Level Security: isolamento por empresa + permissões por papel
--   admin      → tudo da própria empresa
--   atendente  → clientes, veículos, orçamentos, OS, caixa, contas a receber, notas
--   instalador → somente OS atribuídas a ele (e dados necessários para executá-las)
-- =============================================================================

-- A OS está atribuída ao usuário atual (na OS inteira ou em algum item)?
create or replace function public.os_do_instalador(p_os uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ordens_servico o
    where o.id = p_os
      and o.empresa_id = public.empresa_atual()
      and o.deleted_at is null
      and (
        o.instalador_id = (select auth.uid())
        or exists (select 1 from public.os_itens i where i.os_id = o.id and i.instalador_id = (select auth.uid()))
      )
  )
$$;

create or replace function public.cliente_do_instalador(p_cliente uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ordens_servico o
    where o.cliente_id = p_cliente
      and o.empresa_id = public.empresa_atual()
      and o.deleted_at is null
      and (
        o.instalador_id = (select auth.uid())
        or exists (select 1 from public.os_itens i where i.os_id = o.id and i.instalador_id = (select auth.uid()))
      )
  )
$$;

create or replace function public.veiculo_do_instalador(p_veiculo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ordens_servico o
    where o.veiculo_id = p_veiculo
      and o.empresa_id = public.empresa_atual()
      and o.deleted_at is null
      and (
        o.instalador_id = (select auth.uid())
        or exists (select 1 from public.os_itens i where i.os_id = o.id and i.instalador_id = (select auth.uid()))
      )
  )
$$;

-- Cria as 4 políticas padrão (select/insert/update/delete) de uma tabela multiempresa
create or replace function public.criar_politicas(
  p_tabela text,
  p_leitura public.papel_usuario[],
  p_escrita public.papel_usuario[],
  p_permite_delete boolean default false
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_leitura text := quote_literal(p_leitura::text) || '::public.papel_usuario[]';
  v_escrita text := quote_literal(p_escrita::text) || '::public.papel_usuario[]';
begin
  execute format('alter table public.%I enable row level security', p_tabela);
  execute format(
    'create policy %I on public.%I for select to authenticated using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel(variadic %s)))',
    p_tabela || '_select', p_tabela, v_leitura);
  execute format(
    'create policy %I on public.%I for insert to authenticated with check (empresa_id = (select public.empresa_atual()) and (select public.tem_papel(variadic %s)))',
    p_tabela || '_insert', p_tabela, v_escrita);
  execute format(
    'create policy %I on public.%I for update to authenticated using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel(variadic %s))) with check (empresa_id = (select public.empresa_atual()))',
    p_tabela || '_update', p_tabela, v_escrita);
  if p_permite_delete then
    execute format(
      'create policy %I on public.%I for delete to authenticated using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel(variadic %s)))',
      p_tabela || '_delete', p_tabela, v_escrita);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Empresas e perfis
-- -----------------------------------------------------------------------------
alter table public.empresas enable row level security;
create policy empresas_select on public.empresas for select to authenticated
  using (id = (select public.empresa_atual()));
create policy empresas_update on public.empresas for update to authenticated
  using (id = (select public.empresa_atual()) and (select public.tem_papel('admin')))
  with check (id = (select public.empresa_atual()));

alter table public.perfis enable row level security;
create policy perfis_select on public.perfis for select to authenticated
  using (empresa_id = (select public.empresa_atual()));
create policy perfis_update on public.perfis for update to authenticated
  using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('admin')))
  with check (empresa_id = (select public.empresa_atual()));
-- inserção/exclusão de perfis: somente pelo servidor (service role), após validar que quem pede é admin

alter table public.contadores enable row level security; -- acesso só via proximo_numero()
alter table public.fiscal_webhook_eventos enable row level security; -- somente service role

-- -----------------------------------------------------------------------------
-- Configurações e catálogo
-- -----------------------------------------------------------------------------
select public.criar_politicas('empresa_config_fiscal', '{admin}', '{admin}');
select public.criar_politicas('categorias_veiculo', '{admin,atendente,instalador}', '{admin}');
select public.criar_politicas('categorias_financeiras', '{admin}', '{admin}');
select public.criar_politicas('produtos', '{admin,atendente,instalador}', '{admin}');
select public.criar_politicas('produto_codigos_fornecedor', '{admin,atendente}', '{admin}', true);
select public.criar_politicas('servicos', '{admin,atendente,instalador}', '{admin}');
select public.criar_politicas('servico_precos_categoria', '{admin,atendente,instalador}', '{admin}', true);
select public.criar_politicas('linhas_pelicula', '{admin,atendente,instalador}', '{admin}');
select public.criar_politicas('tabela_precos_pelicula', '{admin,atendente,instalador}', '{admin}', true);

-- -----------------------------------------------------------------------------
-- Clientes e veículos (instalador vê apenas os vinculados às suas OS)
-- -----------------------------------------------------------------------------
select public.criar_politicas('clientes', '{admin,atendente}', '{admin,atendente}');
create policy clientes_select_instalador on public.clientes for select to authenticated
  using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('instalador')) and public.cliente_do_instalador(id));

select public.criar_politicas('veiculos', '{admin,atendente}', '{admin,atendente}');
create policy veiculos_select_instalador on public.veiculos for select to authenticated
  using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('instalador')) and public.veiculo_do_instalador(id));

-- -----------------------------------------------------------------------------
-- Estoque
-- -----------------------------------------------------------------------------
select public.criar_politicas('notas_compra', '{admin,atendente}', '{admin}');
select public.criar_politicas('rolos_pelicula', '{admin,atendente}', '{admin}');
select public.criar_politicas('numeros_serie', '{admin,atendente}', '{admin}');
-- movimentações: inserção manual só por admin; saídas da OS são feitas pela função concluir_os()
alter table public.movimentacoes_estoque enable row level security;
create policy movimentacoes_estoque_select on public.movimentacoes_estoque for select to authenticated
  using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('admin', 'atendente')));
create policy movimentacoes_estoque_insert on public.movimentacoes_estoque for insert to authenticated
  with check (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('admin')));

-- -----------------------------------------------------------------------------
-- Orçamentos
-- -----------------------------------------------------------------------------
select public.criar_politicas('orcamentos', '{admin,atendente}', '{admin,atendente}');
select public.criar_politicas('orcamento_itens', '{admin,atendente}', '{admin,atendente}', true);

-- -----------------------------------------------------------------------------
-- Ordens de serviço
-- -----------------------------------------------------------------------------
select public.criar_politicas('ordens_servico', '{admin,atendente}', '{admin,atendente}');
create policy ordens_servico_select_instalador on public.ordens_servico for select to authenticated
  using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('instalador')) and public.os_do_instalador(id));

select public.criar_politicas('os_itens', '{admin,atendente}', '{admin,atendente}', true);
create policy os_itens_select_instalador on public.os_itens for select to authenticated
  using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('instalador')) and public.os_do_instalador(os_id));

alter table public.os_historico enable row level security;
create policy os_historico_select on public.os_historico for select to authenticated
  using (
    empresa_id = (select public.empresa_atual())
    and ((select public.tem_papel('admin', 'atendente')) or public.os_do_instalador(os_id))
  );
create policy os_historico_insert on public.os_historico for insert to authenticated
  with check (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('admin', 'atendente')));

alter table public.comissoes enable row level security;
create policy comissoes_select on public.comissoes for select to authenticated
  using (
    empresa_id = (select public.empresa_atual())
    and ((select public.tem_papel('admin')) or instalador_id = (select auth.uid()))
  );
create policy comissoes_update on public.comissoes for update to authenticated
  using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('admin')))
  with check (empresa_id = (select public.empresa_atual()));

select public.criar_politicas('anexos', '{admin,atendente}', '{admin,atendente}');
create policy anexos_instalador_select on public.anexos for select to authenticated
  using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('instalador'))
         and entidade = 'os' and public.os_do_instalador(entidade_id));
create policy anexos_instalador_insert on public.anexos for insert to authenticated
  with check (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('instalador'))
              and entidade = 'os' and public.os_do_instalador(entidade_id));

-- -----------------------------------------------------------------------------
-- Notas fiscais
-- -----------------------------------------------------------------------------
select public.criar_politicas('notas_fiscais', '{admin,atendente}', '{admin,atendente}');
select public.criar_politicas('nota_itens', '{admin,atendente}', '{admin,atendente}', true);
select public.criar_politicas('notas_eventos', '{admin,atendente}', '{admin,atendente}');

-- -----------------------------------------------------------------------------
-- Financeiro
-- -----------------------------------------------------------------------------
select public.criar_politicas('caixas', '{admin,atendente}', '{admin,atendente}');
select public.criar_politicas('contas_receber', '{admin,atendente}', '{admin,atendente}');
select public.criar_politicas('contas_pagar', '{admin}', '{admin}');
alter table public.caixa_movimentos enable row level security;
create policy caixa_movimentos_select on public.caixa_movimentos for select to authenticated
  using (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('admin', 'atendente')));
create policy caixa_movimentos_insert on public.caixa_movimentos for insert to authenticated
  with check (empresa_id = (select public.empresa_atual()) and (select public.tem_papel('admin', 'atendente')));

-- -----------------------------------------------------------------------------
-- Garantia: nenhuma tabela pública sem RLS
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    raise exception 'Tabela public.% está sem RLS habilitado.', r.relname;
  end loop;
end;
$$;

-- Funções auxiliares de migração não devem ser chamadas pela API
revoke execute on function public.criar_politicas(text, public.papel_usuario[], public.papel_usuario[], boolean) from public, anon, authenticated;
revoke execute on function public.aplicar_gatilhos_padrao(regclass, boolean, boolean) from public, anon, authenticated;
