-- Phase 3: ingestion pipeline support.

alter table public.sources add column if not exists max_pages int not null default 50;

-- Private bucket for uploaded documents. Objects live under "<workspace_id>/<file>".
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 20971520)
on conflict (id) do nothing;

create policy documents_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy documents_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.can_edit(((storage.foldername(name))[1])::uuid));
create policy documents_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.can_edit(((storage.foldername(name))[1])::uuid));
