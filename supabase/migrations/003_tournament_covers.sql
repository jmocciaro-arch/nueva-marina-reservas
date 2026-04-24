-- Portada de torneos/ligas: URL externa o archivo subido a Storage
alter table tournaments
  add column if not exists cover_image_url text;

-- Bucket público para portadas
insert into storage.buckets (id, name, public)
values ('tournament-covers', 'tournament-covers', true)
on conflict (id) do nothing;

-- Policies
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'tournament_covers_public_read') then
    create policy tournament_covers_public_read on storage.objects
      for select using (bucket_id = 'tournament-covers');
  end if;

  if not exists (select 1 from pg_policies where policyname = 'tournament_covers_auth_insert') then
    create policy tournament_covers_auth_insert on storage.objects
      for insert to authenticated with check (bucket_id = 'tournament-covers');
  end if;

  if not exists (select 1 from pg_policies where policyname = 'tournament_covers_auth_update') then
    create policy tournament_covers_auth_update on storage.objects
      for update to authenticated using (bucket_id = 'tournament-covers');
  end if;

  if not exists (select 1 from pg_policies where policyname = 'tournament_covers_auth_delete') then
    create policy tournament_covers_auth_delete on storage.objects
      for delete to authenticated using (bucket_id = 'tournament-covers');
  end if;
end $$;
