-- =========================================================
-- DINI ANIF — TEMPLATE LIBRARY V1
-- Jalankan SEKALI di Supabase SQL Editor project DINI ANIF.
-- Project ini berdiri sendiri dan tidak terhubung ke project lain.
-- =========================================================

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  source_path text not null default '/',
  status text not null default 'draft' check (status in ('draft','active')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.templates enable row level security;

drop policy if exists "Public can read active template" on public.templates;
create policy "Public can read active template"
on public.templates for select
to anon
using (is_active = true);

drop policy if exists "Admins can read templates" on public.templates;
create policy "Admins can read templates"
on public.templates for select
to authenticated
using (true);

drop policy if exists "Admins can insert templates" on public.templates;
create policy "Admins can insert templates"
on public.templates for insert
to authenticated
with check (true);

drop policy if exists "Admins can update templates" on public.templates;
create policy "Admins can update templates"
on public.templates for update
to authenticated
using (true)
with check (true);

drop policy if exists "Admins can delete templates" on public.templates;
create policy "Admins can delete templates"
on public.templates for delete
to authenticated
using (true);


-- V2: package import metadata
alter table public.templates add column if not exists package_path text;
alter table public.templates add column if not exists manifest_json jsonb not null default '{}'::jsonb;

-- Bucket khusus paket template Dini Anif.
insert into storage.buckets (id,name,public)
values ('template-packages','template-packages',true)
on conflict (id) do update set public=true;

drop policy if exists "Public can read Dini Anif template packages" on storage.objects;
create policy "Public can read Dini Anif template packages"
on storage.objects for select
to public
using (bucket_id='template-packages');

drop policy if exists "Admins can upload Dini Anif template packages" on storage.objects;
create policy "Admins can upload Dini Anif template packages"
on storage.objects for insert
to authenticated
with check (bucket_id='template-packages');

drop policy if exists "Admins can update Dini Anif template packages" on storage.objects;
create policy "Admins can update Dini Anif template packages"
on storage.objects for update
to authenticated
using (bucket_id='template-packages')
with check (bucket_id='template-packages');

drop policy if exists "Admins can delete Dini Anif template packages" on storage.objects;
create policy "Admins can delete Dini Anif template packages"
on storage.objects for delete
to authenticated
using (bucket_id='template-packages');

-- Seed halaman utama saat ini sebagai Template 1 dan aktif.
insert into public.templates (id,name,slug,source_path,status,is_active)
select gen_random_uuid(),'Template 1','template-1','/','active',true
where not exists (select 1 from public.templates where slug='template-1');

update public.templates
set source_path='/', status='active', is_active=true, updated_at=now()
where slug='template-1'
  and not exists (select 1 from public.templates where is_active=true and slug<>'template-1');
