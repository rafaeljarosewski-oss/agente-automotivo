-- =============================================================================
-- Agendamento da sincronização fiscal dentro do próprio banco (pg_cron + pg_net).
-- Substitui a necessidade de cron frequente na Vercel (Hobby só permite diário) e de
-- segredos no GitHub: o deploy chama configurar_sincronizacao_fiscal(url, segredo) uma vez.
-- O segredo fica no Supabase Vault (criptografado), nunca em texto puro na definição do job.
-- =============================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.configurar_sincronizacao_fiscal(p_url_app text, p_segredo text, p_agenda text default '*/10 * * * *')
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_segredo_id uuid;
  v_url text := rtrim(p_url_app, '/') || '/api/cron/fiscal-sync';
begin
  if p_url_app !~ '^https?://[^ ]+$' then
    raise exception 'Endereço do sistema inválido: %', p_url_app;
  end if;
  if coalesce(length(p_segredo), 0) < 16 then
    raise exception 'O segredo das rotinas (CRON_SECRET) deve ter pelo menos 16 caracteres.';
  end if;

  select id into v_segredo_id from vault.secrets where name = 'orion_cron_secret';
  if v_segredo_id is null then
    perform vault.create_secret(p_segredo, 'orion_cron_secret', 'CRON_SECRET usado pelo agendamento da sincronização fiscal');
  else
    perform vault.update_secret(v_segredo_id, p_segredo, 'orion_cron_secret');
  end if;

  -- cron.schedule com o mesmo nome substitui o agendamento anterior
  return cron.schedule(
    'orion-sincronizacao-fiscal',
    p_agenda,
    format(
      $job$select net.http_get(
        url := %L,
        headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'orion_cron_secret')),
        timeout_milliseconds := 60000
      )$job$,
      v_url
    )
  );
end;
$$;

comment on function public.configurar_sincronizacao_fiscal(text, text, text) is
  'Agenda (ou reagenda) a chamada periódica de /api/cron/fiscal-sync. Uso exclusivo do deploy (service_role/postgres).';

revoke all on function public.configurar_sincronizacao_fiscal(text, text, text) from public, anon, authenticated;
