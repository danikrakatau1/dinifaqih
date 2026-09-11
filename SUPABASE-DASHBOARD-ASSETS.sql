-- =========================================================
-- DASHBOARD ADMIN: FOTO & MUSIK
-- Jalankan di Supabase SQL Editor.
-- =========================================================

create table if not exists public.site_assets (
  asset_key text primary key,
  public_url text not null,
  storage_path text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_assets enable row level security;

drop policy if exists "Public can read site assets" on public.site_assets;
create policy "Public can read site assets"
on public.site_assets for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert site assets" on public.site_assets;
create policy "Admins can insert site assets"
on public.site_assets for insert
to authenticated
with check (true);

drop policy if exists "Admins can update site assets" on public.site_assets;
create policy "Admins can update site assets"
on public.site_assets for update
to authenticated
using (true)
with check (true);

drop policy if exists "Admins can delete site assets" on public.site_assets;
create policy "Admins can delete site assets"
on public.site_assets for delete
to authenticated
using (true);

-- Bucket publik supaya foto/audio bisa dibaca oleh halaman undangan.
insert into storage.buckets (id, name, public)
values ('invitation-assets', 'invitation-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Admins can upload invitation assets" on storage.objects;
create policy "Admins can upload invitation assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'invitation-assets');

drop policy if exists "Admins can update invitation assets" on storage.objects;
create policy "Admins can update invitation assets"
on storage.objects for update
to authenticated
using (bucket_id = 'invitation-assets')
with check (bucket_id = 'invitation-assets');

drop policy if exists "Admins can delete invitation assets" on storage.objects;
create policy "Admins can delete invitation assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'invitation-assets');

drop policy if exists "Public can read invitation assets" on storage.objects;
create policy "Public can read invitation assets"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'invitation-assets');
