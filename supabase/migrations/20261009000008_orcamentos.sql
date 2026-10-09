-- =============================================================================
-- Orçamentos: expiração automática
-- =============================================================================

-- Marca como expirados os orçamentos (rascunho/enviado) com validade vencida.
-- Chamada ao abrir a listagem e pela rotina diária.
create or replace function public.expirar_orcamentos()
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  with alterados as (
    update public.orcamentos
       set status = 'expirado'
     where status in ('rascunho', 'enviado')
       and deleted_at is null
       and validade < (now() at time zone 'America/Sao_Paulo')::date
    returning id
  )
  select count(*)::integer from alterados
$$;
