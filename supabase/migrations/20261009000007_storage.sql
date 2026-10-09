-- =============================================================================
-- Storage: bucket privado "empresa", com uma pasta por empresa ({empresa_id}/...)
--   {empresa_id}/logo/...            logotipo
--   {empresa_id}/notas/{nota_id}/... XML e PDF das notas emitidas
--   {empresa_id}/compras/...         XML de NF-e de compra importados
--   {empresa_id}/anexos/...          anexos (Fase 2: fotos do checklist)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('empresa', 'empresa', false, 10485760)
on conflict (id) do nothing;

create policy "empresa_arquivos_select" on storage.objects for select to authenticated
  using (bucket_id = 'empresa' and (storage.foldername(name))[1] = (select public.empresa_atual())::text);

create policy "empresa_arquivos_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'empresa'
    and (storage.foldername(name))[1] = (select public.empresa_atual())::text
    and (select public.tem_papel('admin', 'atendente'))
  );

create policy "empresa_arquivos_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'empresa'
    and (storage.foldername(name))[1] = (select public.empresa_atual())::text
    and (select public.tem_papel('admin', 'atendente'))
  );

create policy "empresa_arquivos_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'empresa'
    and (storage.foldername(name))[1] = (select public.empresa_atual())::text
    and (select public.tem_papel('admin'))
  );
