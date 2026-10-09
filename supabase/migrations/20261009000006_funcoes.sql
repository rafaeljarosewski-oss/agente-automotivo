-- =============================================================================
-- Funções de negócio (RPC). Operações que precisam ser atômicas ficam no banco.
-- Os cálculos (preços, parcelas, comissões) são feitos na aplicação (TypeScript,
-- com testes unitários) e validados aqui antes de gravar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Busca rápida de clientes: nome, telefone, CPF/CNPJ ou placa em um só campo
-- -----------------------------------------------------------------------------
create or replace function public.buscar_clientes(p_termo text, p_limite integer default 20)
returns table (
  id uuid,
  nome text,
  tipo_pessoa public.tipo_pessoa,
  cpf_cnpj text,
  telefone text,
  whatsapp text,
  placas text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with t as (
    select
      public.normalizar_busca(trim(coalesce(p_termo, ''))) as texto,
      public.somente_digitos(p_termo) as digitos,
      upper(regexp_replace(coalesce(p_termo, ''), '[^A-Za-z0-9]', '', 'g')) as placa
  )
  select c.id, c.nome, c.tipo_pessoa, c.cpf_cnpj, c.telefone, c.whatsapp,
         (select string_agg(v.placa, ', ' order by v.placa) from public.veiculos v where v.cliente_id = c.id and v.deleted_at is null) as placas
  from public.clientes c, t
  where c.deleted_at is null
    and (
      t.texto = ''
      or c.busca like '%' || t.texto || '%'
      or (t.digitos is not null and length(t.digitos) >= 3 and (
            c.cpf_cnpj like '%' || t.digitos || '%'
         or public.somente_digitos(c.telefone) like '%' || t.digitos || '%'
         or public.somente_digitos(c.whatsapp) like '%' || t.digitos || '%'))
      or (length(t.placa) >= 5 and c.cpf_cnpj like '%' || t.placa || '%')
      or (length(t.placa) >= 3 and exists (
            select 1 from public.veiculos v
            where v.cliente_id = c.id and v.deleted_at is null and v.placa like '%' || t.placa || '%'))
    )
  order by c.nome
  limit greatest(1, least(coalesce(p_limite, 20), 100))
$$;

-- -----------------------------------------------------------------------------
-- Orçamento aprovado → OS (um clique)
-- -----------------------------------------------------------------------------
create or replace function public.gerar_os_de_orcamento(p_orcamento uuid, p_instalador uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_orc public.orcamentos;
  v_os uuid;
begin
  if not public.tem_papel('admin', 'atendente') then
    raise exception 'Somente administradores e atendentes podem gerar OS.' using errcode = '42501';
  end if;

  select * into v_orc from public.orcamentos where id = p_orcamento and deleted_at is null for update;
  if not found then
    raise exception 'Orçamento não encontrado.';
  end if;
  if v_orc.status in ('recusado', 'expirado') then
    raise exception 'Orçamento % não pode virar OS (status: %).', v_orc.numero, v_orc.status;
  end if;
  if exists (select 1 from public.ordens_servico where orcamento_id = p_orcamento and deleted_at is null) then
    raise exception 'Este orçamento já gerou uma OS.';
  end if;
  if not exists (select 1 from public.orcamento_itens where orcamento_id = p_orcamento) then
    raise exception 'O orçamento não tem itens.';
  end if;

  insert into public.ordens_servico (
    empresa_id, numero, orcamento_id, cliente_id, veiculo_id, instalador_id, observacoes,
    subtotal_centavos, desconto_itens_centavos, desconto_total_centavos, total_centavos
  ) values (
    v_orc.empresa_id, public.proximo_numero(v_orc.empresa_id, 'os'), v_orc.id, v_orc.cliente_id, v_orc.veiculo_id,
    p_instalador, v_orc.observacoes, v_orc.subtotal_centavos, v_orc.desconto_itens_centavos,
    v_orc.desconto_total_centavos, v_orc.total_centavos
  ) returning id into v_os;

  insert into public.os_itens (
    empresa_id, os_id, ordem, tipo, servico_id, produto_id, linha_pelicula_id, descricao, quantidade, unidade,
    preco_unitario_centavos, desconto_centavos, total_centavos, medidas, area_m2, consumo_metros
  )
  select empresa_id, v_os, ordem, tipo, servico_id, produto_id, linha_pelicula_id, descricao, quantidade, unidade,
         preco_unitario_centavos, desconto_centavos, total_centavos, medidas, area_m2, consumo_metros
  from public.orcamento_itens
  where orcamento_id = p_orcamento
  order by ordem;

  update public.orcamentos
    set status = 'aprovado', aprovado_em = coalesce(aprovado_em, now())
    where id = p_orcamento;

  insert into public.os_historico (empresa_id, os_id, status_novo, observacao)
  values (v_orc.empresa_id, v_os, 'aberta', 'OS gerada a partir do orçamento nº ' || v_orc.numero);

  return v_os;
end;
$$;

-- -----------------------------------------------------------------------------
-- Mudança de status da OS (exceto conclusão, que tem função própria)
-- -----------------------------------------------------------------------------
create or replace function public.alterar_status_os(p_os uuid, p_status public.status_os, p_observacao text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_os public.ordens_servico;
  v_papel public.papel_usuario := public.papel_atual();
  v_permitido boolean;
begin
  select * into v_os from public.ordens_servico
   where id = p_os and empresa_id = public.empresa_atual() and deleted_at is null
   for update;
  if not found then
    raise exception 'OS não encontrada.' using errcode = 'P0002';
  end if;

  if v_papel is null then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if v_papel = 'instalador' and not public.os_do_instalador(p_os) then
    raise exception 'Esta OS não está atribuída a você.' using errcode = '42501';
  end if;

  if p_status = 'concluida' then
    raise exception 'Use a conclusão da OS para concluí-la (gera baixa de estoque e contas a receber).';
  end if;
  if v_os.status = p_status then
    return;
  end if;

  v_permitido := case v_os.status
    when 'aberta' then p_status in ('em_execucao', 'aguardando_peca', 'cancelada')
    when 'em_execucao' then p_status in ('aberta', 'aguardando_peca', 'cancelada')
    when 'aguardando_peca' then p_status in ('aberta', 'em_execucao', 'cancelada')
    when 'concluida' then p_status in ('entregue')
    else false
  end;
  if not v_permitido then
    raise exception 'Não é possível mudar a OS de "%" para "%".', v_os.status, p_status;
  end if;

  if v_papel = 'instalador' and p_status not in ('aberta', 'em_execucao', 'aguardando_peca', 'entregue') then
    raise exception 'Instaladores não podem cancelar OS.' using errcode = '42501';
  end if;
  if p_status = 'cancelada' and coalesce(trim(p_observacao), '') = '' then
    raise exception 'Informe o motivo do cancelamento.';
  end if;

  update public.ordens_servico set
    status = p_status,
    iniciada_em = case when p_status = 'em_execucao' then coalesce(iniciada_em, now()) else iniciada_em end,
    entregue_em = case when p_status = 'entregue' then now() else entregue_em end,
    cancelada_em = case when p_status = 'cancelada' then now() else cancelada_em end,
    motivo_cancelamento = case when p_status = 'cancelada' then p_observacao else motivo_cancelamento end
  where id = p_os;

  insert into public.os_historico (empresa_id, os_id, status_anterior, status_novo, observacao)
  values (v_os.empresa_id, p_os, v_os.status, p_status, p_observacao);
end;
$$;

-- -----------------------------------------------------------------------------
-- Baixa de película (metros) nos rolos, do mais antigo para o mais novo.
-- Se faltar saldo nos rolos, a diferença é baixada sem rolo (estoque negativo
-- fica visível no painel para correção).
-- -----------------------------------------------------------------------------
create or replace function public._baixar_metros(
  p_empresa uuid, p_produto uuid, p_metros numeric, p_os uuid, p_item uuid, p_motivo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restante numeric := p_metros;
  v_rolo record;
  v_baixa numeric;
begin
  if p_metros is null or p_metros <= 0 then
    return;
  end if;
  for v_rolo in
    select id, saldo_metros from public.rolos_pelicula
    where empresa_id = p_empresa and produto_id = p_produto and ativo and saldo_metros > 0
    order by created_at, id
    for update
  loop
    exit when v_restante <= 0;
    v_baixa := least(v_restante, v_rolo.saldo_metros);
    insert into public.movimentacoes_estoque (empresa_id, produto_id, rolo_id, tipo, quantidade, motivo, os_id, os_item_id)
    values (p_empresa, p_produto, v_rolo.id, 'saida', -v_baixa, p_motivo, p_os, p_item);
    v_restante := v_restante - v_baixa;
  end loop;

  if v_restante > 0 then
    insert into public.movimentacoes_estoque (empresa_id, produto_id, tipo, quantidade, motivo, os_id, os_item_id)
    values (p_empresa, p_produto, 'saida', -v_restante, p_motivo || ' (sem rolo com saldo)', p_os, p_item);
  end if;
end;
$$;

revoke execute on function public._baixar_metros(uuid, uuid, numeric, uuid, uuid, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Conclusão da OS (atômica):
--   1. valida números de série
--   2. baixa de estoque (unidades, metros de película pela tabela de consumo)
--   3. comissões dos instaladores (calculadas na aplicação, validadas aqui)
--   4. contas a receber (parcelas calculadas na aplicação, validadas aqui)
-- p_parcelas:  [{"parcela":1,"valor_centavos":1000,"vencimento":"2026-10-09","forma_pagamento":"pix"}]
-- p_comissoes: [{"os_item_id":"...","instalador_id":"...","base_centavos":1000,"valor_centavos":100}]
-- -----------------------------------------------------------------------------
create or replace function public.concluir_os(p_os uuid, p_parcelas jsonb, p_comissoes jsonb default '[]'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_os public.ordens_servico;
  v_papel public.papel_usuario := public.papel_atual();
  v_item record;
  v_serie text;
  v_status_serie text;
  v_produto_consumo uuid;
  v_soma bigint;
  v_total_parcelas integer;
  v_motivo text;
  v_cliente_nome text;
begin
  select * into v_os from public.ordens_servico
   where id = p_os and empresa_id = public.empresa_atual() and deleted_at is null
   for update;
  if not found then
    raise exception 'OS não encontrada.' using errcode = 'P0002';
  end if;
  if v_papel is null or (v_papel = 'instalador' and not public.os_do_instalador(p_os)) then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if v_os.status not in ('aberta', 'em_execucao', 'aguardando_peca') then
    raise exception 'A OS nº % não pode ser concluída (status atual: %).', v_os.numero, v_os.status;
  end if;
  if not exists (select 1 from public.os_itens where os_id = p_os) then
    raise exception 'A OS não tem itens.';
  end if;

  v_motivo := 'OS nº ' || v_os.numero;

  -- 1 e 2: estoque
  for v_item in
    select i.*, p.tipo_controle, p.exige_numero_serie, p.nome as produto_nome,
           s.produto_consumo_id, l.produto_id as linha_produto_id
    from public.os_itens i
    left join public.produtos p on p.id = i.produto_id
    left join public.servicos s on s.id = i.servico_id
    left join public.linhas_pelicula l on l.id = i.linha_pelicula_id
    where i.os_id = p_os
    order by i.ordem
  loop
    if v_item.tipo = 'produto' then
      if v_item.exige_numero_serie then
        if coalesce(array_length(v_item.numeros_serie, 1), 0) <> v_item.quantidade then
          raise exception 'Informe % número(s) de série para "%".', v_item.quantidade::integer, v_item.produto_nome;
        end if;
        foreach v_serie in array v_item.numeros_serie loop
          select status into v_status_serie from public.numeros_serie
            where empresa_id = v_os.empresa_id and produto_id = v_item.produto_id and numero = v_serie
            for update;
          if found and v_status_serie <> 'disponivel' then
            raise exception 'O número de série % de "%" não está disponível (status: %).', v_serie, v_item.produto_nome, v_status_serie;
          end if;
          insert into public.numeros_serie (empresa_id, produto_id, numero, status, os_item_id)
          values (v_os.empresa_id, v_item.produto_id, v_serie, 'vendido', v_item.id)
          on conflict (empresa_id, produto_id, numero)
          do update set status = 'vendido', os_item_id = excluded.os_item_id;
        end loop;
      end if;

      if v_item.tipo_controle = 'metro' then
        perform public._baixar_metros(v_os.empresa_id, v_item.produto_id, v_item.quantidade, p_os, v_item.id, v_motivo);
      else
        insert into public.movimentacoes_estoque (empresa_id, produto_id, tipo, quantidade, motivo, os_id, os_item_id)
        values (v_os.empresa_id, v_item.produto_id, 'saida', -v_item.quantidade, v_motivo, p_os, v_item.id);
      end if;
    else
      v_produto_consumo := coalesce(v_item.linha_produto_id, v_item.produto_consumo_id);
      if v_produto_consumo is not null and coalesce(v_item.consumo_metros, 0) > 0 then
        perform public._baixar_metros(v_os.empresa_id, v_produto_consumo, v_item.consumo_metros, p_os, v_item.id,
                                      v_motivo || ' — ' || v_item.descricao);
      end if;
    end if;
  end loop;

  -- 3: comissões
  insert into public.comissoes (empresa_id, os_id, os_item_id, instalador_id, base_centavos, valor_centavos, competencia)
  select v_os.empresa_id, p_os, c.os_item_id, c.instalador_id, coalesce(c.base_centavos, 0), c.valor_centavos, current_date
  from jsonb_to_recordset(coalesce(p_comissoes, '[]'::jsonb))
       as c(os_item_id uuid, instalador_id uuid, base_centavos bigint, valor_centavos bigint)
  where c.valor_centavos > 0;

  if exists (
    select 1 from public.comissoes c
    left join public.perfis pf on pf.id = c.instalador_id and pf.empresa_id = v_os.empresa_id
    left join public.os_itens i on i.id = c.os_item_id and i.os_id = p_os
    where c.os_id = p_os and (pf.id is null or (c.os_item_id is not null and i.id is null))
  ) then
    raise exception 'Comissão com instalador ou item inválido.';
  end if;

  -- 4: contas a receber
  if v_os.total_centavos > 0 then
    select coalesce(sum((p->>'valor_centavos')::bigint), 0), count(*)
      into v_soma, v_total_parcelas
      from jsonb_array_elements(coalesce(p_parcelas, '[]'::jsonb)) p;
    if v_soma <> v_os.total_centavos then
      raise exception 'A soma das parcelas (%) difere do total da OS (%).', v_soma, v_os.total_centavos;
    end if;

    select nome into v_cliente_nome from public.clientes where id = v_os.cliente_id;

    insert into public.contas_receber (
      empresa_id, os_id, cliente_id, descricao, forma_pagamento, parcela, total_parcelas, valor_centavos, vencimento
    )
    select v_os.empresa_id, p_os, v_os.cliente_id,
           'OS nº ' || v_os.numero || ' — ' || coalesce(v_cliente_nome, '') ||
             case when v_total_parcelas > 1 then ' (' || x.parcela || '/' || v_total_parcelas || ')' else '' end,
           x.forma_pagamento, x.parcela, v_total_parcelas, x.valor_centavos, x.vencimento
    from jsonb_to_recordset(p_parcelas)
         as x(parcela integer, valor_centavos bigint, vencimento date, forma_pagamento public.forma_pagamento);
  end if;

  update public.ordens_servico
     set status = 'concluida', concluida_em = now(), concluida_por = auth.uid(),
         iniciada_em = coalesce(iniciada_em, now())
   where id = p_os;

  insert into public.os_historico (empresa_id, os_id, status_anterior, status_novo, observacao)
  values (v_os.empresa_id, p_os, v_os.status, 'concluida', 'Baixa de estoque e contas a receber geradas');
end;
$$;

-- -----------------------------------------------------------------------------
-- Estoque: entrada manual (com rolo para película e números de série)
-- -----------------------------------------------------------------------------
create or replace function public.registrar_entrada_estoque(
  p_produto uuid,
  p_quantidade numeric,
  p_custo_unitario_centavos bigint default null,
  p_motivo text default 'Entrada manual',
  p_identificacao_rolo text default null,
  p_numeros_serie text[] default '{}',
  p_nota_compra uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prod public.produtos;
  v_rolo uuid;
  v_mov uuid;
  v_serie text;
begin
  if not public.tem_papel('admin') then
    raise exception 'Somente administradores podem lançar entradas de estoque.' using errcode = '42501';
  end if;
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'A quantidade deve ser maior que zero.';
  end if;
  select * into v_prod from public.produtos where id = p_produto and deleted_at is null;
  if not found then
    raise exception 'Produto não encontrado.';
  end if;

  if v_prod.tipo_controle = 'metro' then
    -- O rolo nasce zerado e a movimentação credita o saldo
    insert into public.rolos_pelicula (empresa_id, produto_id, identificacao, metragem_inicial, saldo_metros, nota_compra_id)
    values (v_prod.empresa_id, p_produto, p_identificacao_rolo, p_quantidade, 0, p_nota_compra)
    returning id into v_rolo;
  end if;

  if v_prod.exige_numero_serie and coalesce(array_length(p_numeros_serie, 1), 0) > 0 then
    if array_length(p_numeros_serie, 1) <> p_quantidade then
      raise exception 'Informe exatamente % números de série.', p_quantidade::integer;
    end if;
    foreach v_serie in array p_numeros_serie loop
      insert into public.numeros_serie (empresa_id, produto_id, numero)
      values (v_prod.empresa_id, p_produto, trim(v_serie));
    end loop;
  end if;

  insert into public.movimentacoes_estoque (
    empresa_id, produto_id, rolo_id, tipo, quantidade, custo_unitario_centavos, motivo, nota_compra_id
  ) values (
    v_prod.empresa_id, p_produto, v_rolo, 'entrada', p_quantidade, p_custo_unitario_centavos,
    coalesce(nullif(trim(p_motivo), ''), 'Entrada manual'), p_nota_compra
  ) returning id into v_mov;

  if p_custo_unitario_centavos is not null and p_custo_unitario_centavos > 0 then
    update public.produtos set custo_centavos = p_custo_unitario_centavos where id = p_produto;
  end if;

  return v_mov;
end;
$$;

-- Ajuste manual (inventário, perda, quebra...) — motivo obrigatório
create or replace function public.ajustar_estoque(p_produto uuid, p_delta numeric, p_motivo text, p_rolo uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prod public.produtos;
  v_mov uuid;
begin
  if not public.tem_papel('admin') then
    raise exception 'Somente administradores podem ajustar o estoque.' using errcode = '42501';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo do ajuste.';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'Informe uma quantidade diferente de zero.';
  end if;
  select * into v_prod from public.produtos where id = p_produto and deleted_at is null;
  if not found then
    raise exception 'Produto não encontrado.';
  end if;
  if p_rolo is not null and not exists (select 1 from public.rolos_pelicula where id = p_rolo and produto_id = p_produto) then
    raise exception 'Rolo não pertence a este produto.';
  end if;

  insert into public.movimentacoes_estoque (empresa_id, produto_id, rolo_id, tipo, quantidade, motivo)
  values (v_prod.empresa_id, p_produto, p_rolo, 'ajuste', p_delta, trim(p_motivo))
  returning id into v_mov;
  return v_mov;
end;
$$;

-- -----------------------------------------------------------------------------
-- Numeração de notas fiscais (reserva atômica)
-- -----------------------------------------------------------------------------
create or replace function public.reservar_numero_nota(p_tipo public.tipo_nota)
returns table (serie text, numero bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.empresa_atual();
begin
  if v_empresa is null or not public.tem_papel('admin', 'atendente') then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  return query
    with u as (
      update public.empresa_config_fiscal c set
        nfse_proximo_numero = c.nfse_proximo_numero + case when p_tipo = 'nfse' then 1 else 0 end,
        nfce_proximo_numero = c.nfce_proximo_numero + case when p_tipo = 'nfce' then 1 else 0 end,
        nfe_proximo_numero = c.nfe_proximo_numero + case when p_tipo = 'nfe' then 1 else 0 end
      where c.empresa_id = v_empresa
      returning c.*
    )
    select case p_tipo when 'nfse' then u.nfse_serie when 'nfce' then u.nfce_serie::text else u.nfe_serie::text end,
           case p_tipo when 'nfse' then u.nfse_proximo_numero when 'nfce' then u.nfce_proximo_numero else u.nfe_proximo_numero end - 1
    from u;
end;
$$;

-- -----------------------------------------------------------------------------
-- Caixa do dia
-- -----------------------------------------------------------------------------
create or replace function public.abrir_caixa(p_valor_abertura bigint, p_observacoes text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caixa uuid;
begin
  if not public.tem_papel('admin', 'atendente') then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if exists (select 1 from public.caixas where empresa_id = public.empresa_atual() and status = 'aberto') then
    raise exception 'Já existe um caixa aberto. Feche-o antes de abrir outro.';
  end if;
  insert into public.caixas (empresa_id, valor_abertura_centavos, observacoes)
  values (public.empresa_atual(), greatest(coalesce(p_valor_abertura, 0), 0), p_observacoes)
  returning id into v_caixa;
  if coalesce(p_valor_abertura, 0) > 0 then
    insert into public.caixa_movimentos (empresa_id, caixa_id, tipo, forma_pagamento, valor_centavos, descricao)
    values (public.empresa_atual(), v_caixa, 'abertura', 'dinheiro', p_valor_abertura, 'Fundo de troco');
  end if;
  return v_caixa;
end;
$$;

create or replace function public.caixa_aberto()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select id from public.caixas where empresa_id = public.empresa_atual() and status = 'aberto' limit 1
$$;

create or replace function public.movimentar_caixa(p_tipo public.tipo_mov_caixa, p_valor bigint, p_descricao text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caixa uuid := public.caixa_aberto();
  v_mov uuid;
begin
  if p_tipo not in ('sangria', 'reforco') then
    raise exception 'Use esta função apenas para sangria ou reforço.';
  end if;
  if v_caixa is null then
    raise exception 'Nenhum caixa aberto.';
  end if;
  if coalesce(p_valor, 0) <= 0 then
    raise exception 'Informe um valor maior que zero.';
  end if;
  if coalesce(trim(p_descricao), '') = '' then
    raise exception 'Informe o motivo da %.', case when p_tipo = 'sangria' then 'sangria' else 'reforço' end;
  end if;
  insert into public.caixa_movimentos (empresa_id, caixa_id, tipo, forma_pagamento, valor_centavos, descricao)
  values (public.empresa_atual(), v_caixa, p_tipo, 'dinheiro', p_valor, trim(p_descricao))
  returning id into v_mov;
  return v_mov;
end;
$$;

-- Saldo esperado do caixa por forma de pagamento
create or replace function public.resumo_caixa(p_caixa uuid)
returns table (forma_pagamento public.forma_pagamento, entradas bigint, saidas bigint, esperado bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with formas as (
    select unnest(enum_range(null::public.forma_pagamento)) as forma
  ), mov as (
    select m.forma_pagamento,
           sum(case when m.tipo in ('abertura', 'reforco', 'recebimento') then m.valor_centavos else 0 end) as entradas,
           sum(case when m.tipo in ('sangria', 'pagamento') then m.valor_centavos else 0 end) as saidas
    from public.caixa_movimentos m
    where m.caixa_id = p_caixa
    group by m.forma_pagamento
  )
  select f.forma, coalesce(mov.entradas, 0)::bigint, coalesce(mov.saidas, 0)::bigint,
         (coalesce(mov.entradas, 0) - coalesce(mov.saidas, 0))::bigint
  from formas f
  left join mov on mov.forma_pagamento = f.forma
$$;

-- p_conferencia: {"dinheiro": 15000, "pix": 30000, ...} (valores contados/informados em centavos)
create or replace function public.fechar_caixa(p_conferencia jsonb, p_observacoes text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caixa uuid := public.caixa_aberto();
  v_conf jsonb := '{}'::jsonb;
  v_dif bigint := 0;
  r record;
  v_informado bigint;
begin
  if v_caixa is null then
    raise exception 'Nenhum caixa aberto.';
  end if;
  for r in select * from public.resumo_caixa(v_caixa) loop
    v_informado := coalesce((p_conferencia->>(r.forma_pagamento::text))::bigint, r.esperado);
    v_conf := v_conf || jsonb_build_object(
      r.forma_pagamento::text,
      jsonb_build_object('esperado', r.esperado, 'informado', v_informado, 'diferenca', v_informado - r.esperado)
    );
    v_dif := v_dif + (v_informado - r.esperado);
  end loop;

  update public.caixas
     set status = 'fechado', fechado_em = now(), fechado_por = auth.uid(),
         conferencia = v_conf, diferenca_centavos = v_dif,
         observacoes = coalesce(nullif(trim(p_observacoes), ''), observacoes)
   where id = v_caixa;
  return v_caixa;
end;
$$;

-- -----------------------------------------------------------------------------
-- Baixa de títulos
-- -----------------------------------------------------------------------------
create or replace function public.baixar_conta_receber(
  p_conta uuid, p_valor_pago bigint, p_forma public.forma_pagamento, p_data timestamptz default now()
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conta public.contas_receber;
  v_caixa uuid := public.caixa_aberto();
begin
  select * into v_conta from public.contas_receber where id = p_conta for update;
  if not found then
    raise exception 'Título não encontrado.';
  end if;
  if v_conta.status <> 'aberto' then
    raise exception 'Este título já está %.', case v_conta.status when 'pago' then 'pago' else 'cancelado' end;
  end if;
  if coalesce(p_valor_pago, 0) <= 0 then
    raise exception 'Informe o valor recebido.';
  end if;
  if p_forma = 'dinheiro' and v_caixa is null then
    raise exception 'Abra o caixa do dia para receber em dinheiro.';
  end if;

  update public.contas_receber
     set status = 'pago', pago_em = coalesce(p_data, now()), valor_pago_centavos = p_valor_pago,
         forma_pagamento_baixa = p_forma, caixa_id = v_caixa
   where id = p_conta;

  if v_caixa is not null then
    insert into public.caixa_movimentos (empresa_id, caixa_id, tipo, forma_pagamento, valor_centavos, descricao, conta_receber_id)
    values (v_conta.empresa_id, v_caixa, 'recebimento', p_forma, p_valor_pago, v_conta.descricao, p_conta);
  end if;
end;
$$;

create or replace function public.pagar_conta_pagar(
  p_conta uuid, p_valor_pago bigint, p_forma public.forma_pagamento, p_data timestamptz default now()
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conta public.contas_pagar;
  v_caixa uuid := public.caixa_aberto();
begin
  select * into v_conta from public.contas_pagar where id = p_conta and deleted_at is null for update;
  if not found then
    raise exception 'Conta não encontrada.';
  end if;
  if v_conta.status <> 'aberto' then
    raise exception 'Esta conta já foi paga ou cancelada.';
  end if;
  if coalesce(p_valor_pago, 0) <= 0 then
    raise exception 'Informe o valor pago.';
  end if;

  update public.contas_pagar
     set status = 'pago', pago_em = coalesce(p_data, now()), valor_pago_centavos = p_valor_pago,
         forma_pagamento = p_forma, caixa_id = case when p_forma = 'dinheiro' then v_caixa else null end
   where id = p_conta;

  -- Pagamento em dinheiro sai do caixa aberto
  if p_forma = 'dinheiro' and v_caixa is not null then
    insert into public.caixa_movimentos (empresa_id, caixa_id, tipo, forma_pagamento, valor_centavos, descricao, conta_pagar_id)
    values (v_conta.empresa_id, v_caixa, 'pagamento', 'dinheiro', p_valor_pago, v_conta.descricao, p_conta);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Painel inicial
-- -----------------------------------------------------------------------------
create or replace function public.painel_indicadores(p_hoje date default current_date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'faturamento_dia', (select coalesce(sum(total_centavos), 0) from public.ordens_servico
                         where deleted_at is null and status in ('concluida', 'entregue')
                           and (concluida_em at time zone 'America/Sao_Paulo')::date = p_hoje),
    'faturamento_mes', (select coalesce(sum(total_centavos), 0) from public.ordens_servico
                         where deleted_at is null and status in ('concluida', 'entregue')
                           and date_trunc('month', concluida_em at time zone 'America/Sao_Paulo') = date_trunc('month', p_hoje::timestamp)),
    'recebido_dia', (select coalesce(sum(valor_pago_centavos), 0) from public.contas_receber
                      where status = 'pago' and (pago_em at time zone 'America/Sao_Paulo')::date = p_hoje),
    'os_por_status', (select coalesce(jsonb_object_agg(status, qtd), '{}'::jsonb) from (
                        select status, count(*) as qtd from public.ordens_servico
                        where deleted_at is null and status in ('aberta', 'em_execucao', 'aguardando_peca', 'concluida')
                        group by status) s),
    'receber_vencidos', (select jsonb_build_object('quantidade', count(*), 'valor', coalesce(sum(valor_centavos), 0))
                          from public.contas_receber where status = 'aberto' and vencimento < p_hoje),
    'receber_vencendo', (select jsonb_build_object('quantidade', count(*), 'valor', coalesce(sum(valor_centavos), 0))
                          from public.contas_receber where status = 'aberto' and vencimento between p_hoje and p_hoje + 7),
    'pagar_vencendo', (select jsonb_build_object('quantidade', count(*), 'valor', coalesce(sum(valor_centavos), 0))
                        from public.contas_pagar where deleted_at is null and status = 'aberto' and vencimento <= p_hoje + 7),
    'estoque_baixo', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'estoque_atual', estoque_atual,
                                                                   'estoque_minimo', estoque_minimo, 'unidade', unidade) order by nome), '[]'::jsonb)
                       from public.produtos where deleted_at is null and ativo and estoque_minimo > 0 and estoque_atual <= estoque_minimo),
    'notas_rejeitadas', (select count(*) from public.notas_fiscais where status in ('rejeitada', 'erro')),
    'notas_processando', (select count(*) from public.notas_fiscais where status = 'processando'),
    'orcamentos_abertos', (select count(*) from public.orcamentos where deleted_at is null and status in ('rascunho', 'enviado'))
  )
$$;

-- -----------------------------------------------------------------------------
-- Relatórios (respeitam RLS)
-- -----------------------------------------------------------------------------
create or replace function public.relatorio_faturamento(p_inicio date, p_fim date)
returns table (dia date, quantidade_os bigint, faturado_centavos bigint, recebido_centavos bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with dias as (
    select generate_series(p_inicio, p_fim, interval '1 day')::date as dia
  ), os as (
    select (concluida_em at time zone 'America/Sao_Paulo')::date as dia, count(*) as qtd, sum(total_centavos) as total
    from public.ordens_servico
    where deleted_at is null and status in ('concluida', 'entregue')
      and (concluida_em at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim
    group by 1
  ), rec as (
    select (pago_em at time zone 'America/Sao_Paulo')::date as dia, sum(valor_pago_centavos) as total
    from public.contas_receber
    where status = 'pago' and (pago_em at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim
    group by 1
  )
  select d.dia, coalesce(os.qtd, 0)::bigint, coalesce(os.total, 0)::bigint, coalesce(rec.total, 0)::bigint
  from dias d
  left join os on os.dia = d.dia
  left join rec on rec.dia = d.dia
  order by d.dia
$$;

create or replace function public.relatorio_mais_vendidos(p_inicio date, p_fim date)
returns table (tipo public.tipo_item, referencia_id uuid, descricao text, quantidade numeric, total_centavos bigint, qtd_os bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select i.tipo,
         coalesce(i.servico_id, i.produto_id) as referencia_id,
         coalesce(s.nome, p.nome, i.descricao) as descricao,
         sum(i.quantidade) as quantidade,
         sum(i.total_centavos)::bigint as total_centavos,
         count(distinct i.os_id) as qtd_os
  from public.os_itens i
  join public.ordens_servico o on o.id = i.os_id
  left join public.servicos s on s.id = i.servico_id
  left join public.produtos p on p.id = i.produto_id
  where o.deleted_at is null and o.status in ('concluida', 'entregue')
    and (o.concluida_em at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim
  group by 1, 2, 3
  order by total_centavos desc
$$;

create or replace function public.relatorio_comissoes(p_inicio date, p_fim date)
returns table (instalador_id uuid, instalador_nome text, quantidade_itens bigint, quantidade_os bigint, base_centavos bigint, comissao_centavos bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.instalador_id, p.nome, count(*), count(distinct c.os_id), sum(c.base_centavos)::bigint, sum(c.valor_centavos)::bigint
  from public.comissoes c
  join public.perfis p on p.id = c.instalador_id
  where c.status <> 'cancelado' and c.competencia between p_inicio and p_fim
  group by 1, 2
  order by 6 desc
$$;
