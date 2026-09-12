-- =========================================================
-- DINI & FAQIH — UNIVERSAL GUEST + PRETTY URL V1
-- Target project: jfvmcerrsxjvbiogfqes
-- IMPORTANT: jalankan HANYA pada project DINI & FAQIH.
--
-- Tujuan:
-- 1) Tamu tidak lagi terikat ke template tertentu.
-- 2) URL stabil: /rozak, /rozak-2, /rozak-3, dst.
-- 3) Nama display tetap "Rozak"; suffix hanya milik slug.
-- 4) Menghapus template lama tidak menghapus / memblokir data tamu.
-- 5) Public hanya dapat resolve SATU guest_slug melalui RPC, bukan dump tabel guests.
-- =========================================================

begin;

alter table public.guests add column if not exists guest_slug text;
alter table public.guests add column if not exists template_id uuid;

-- Legacy template binding tetap dipertahankan sebagai kolom kompatibilitas,
-- tetapi dibuat nullable dan FK-nya SET NULL agar tamu tidak ikut hilang / memblokir delete template.
alter table public.guests alter column template_id drop not null;

do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid=c.conrelid
    join pg_namespace n on n.oid=rel.relnamespace
    where n.nspname='public'
      and rel.relname='guests'
      and c.contype='f'
      and pg_get_constraintdef(c.oid) ilike '%template_id%'
      and pg_get_constraintdef(c.oid) ilike '%templates%'
  loop
    execute format('alter table public.guests drop constraint %I',r.conname);
  end loop;
end $$;

alter table public.guests
  add constraint guests_template_id_legacy_fkey
  foreign key (template_id) references public.templates(id)
  on update cascade on delete set null;

-- Duplicate display-name memang diperbolehkan.
-- Hapus UNIQUE constraint/index lama yang hanya mengunci kolom "name", jika ada.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid=c.conrelid
    join pg_namespace n on n.oid=rel.relnamespace
    where n.nspname='public'
      and rel.relname='guests'
      and c.contype='u'
      and pg_get_constraintdef(c.oid) ~* 'UNIQUE\s*\(\s*name\s*\)'
  loop
    execute format('alter table public.guests drop constraint %I',r.conname);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select indexname
    from pg_indexes
    where schemaname='public'
      and tablename='guests'
      and indexdef ~* '^CREATE UNIQUE INDEX'
      and indexdef ~* '\(\s*name\s*\)'
      and indexdef !~* 'guest_slug'
  loop
    execute format('drop index if exists public.%I',r.indexname);
  end loop;
end $$;

create or replace function public.dini_guest_slug_base(p_name text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(lower(trim(coalesce(p_name,''))), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'tamu'
  );
$$;

-- Backfill slug lama dengan suffix collision-safe.
do $$
declare
  r record;
  base_slug text;
  candidate text;
  n integer;
begin
  for r in
    select id,name
    from public.guests
    where guest_slug is null or btrim(guest_slug)=''
    order by created_at asc nulls last, id
  loop
    base_slug := public.dini_guest_slug_base(r.name);
    candidate := base_slug;
    n := 1;
    while exists (
      select 1 from public.guests g
      where lower(g.guest_slug)=lower(candidate)
        and g.id<>r.id
    ) loop
      n := n+1;
      candidate := base_slug||'-'||n;
    end loop;
    update public.guests set guest_slug=candidate where id=r.id;
  end loop;
end $$;

create unique index if not exists guests_guest_slug_unique
  on public.guests (lower(guest_slug));

create index if not exists guests_guest_slug_lookup
  on public.guests (guest_slug);

create or replace function public.dini_assign_guest_slug()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  base_slug text;
  candidate text;
  n integer;
begin
  -- Slug stabil: edit nama tidak mengubah link lama.
  if tg_op='UPDATE' and old.guest_slug is not null and btrim(old.guest_slug)<>'' and
     (new.guest_slug is null or new.guest_slug=old.guest_slug) then
    new.guest_slug := old.guest_slug;
    return new;
  end if;

  base_slug := public.dini_guest_slug_base(coalesce(nullif(new.guest_slug,''),new.name));
  candidate := base_slug;
  n := 1;

  while exists (
    select 1 from public.guests g
    where lower(g.guest_slug)=lower(candidate)
      and (new.id is null or g.id<>new.id)
  ) loop
    n := n+1;
    candidate := base_slug||'-'||n;
  end loop;

  new.guest_slug := candidate;
  return new;
end;
$$;

drop trigger if exists dini_assign_guest_slug_trg on public.guests;
create trigger dini_assign_guest_slug_trg
before insert or update of guest_slug,name
on public.guests
for each row
execute function public.dini_assign_guest_slug();

-- Semua row setelah backfill harus memiliki slug.
alter table public.guests alter column guest_slug set not null;

-- Public resolver: hanya mengembalikan row EXACT dari slug yang diminta.
-- Tidak membuka SELECT anon ke seluruh tabel guests.
create or replace function public.resolve_guest_slug(p_slug text)
returns table(name text, guest_slug text)
language sql
stable
security definer
set search_path=public
as $$
  select g.name,g.guest_slug
  from public.guests g
  where lower(g.guest_slug)=lower(trim(coalesce(p_slug,'')))
  limit 1;
$$;

revoke all on function public.resolve_guest_slug(text) from public;
grant execute on function public.resolve_guest_slug(text) to anon, authenticated;

-- Admin tetap CRUD penuh melalui session authenticated.
alter table public.guests enable row level security;

drop policy if exists "Authenticated can read guests" on public.guests;
create policy "Authenticated can read guests"
on public.guests for select to authenticated
using (true);

drop policy if exists "Authenticated can insert guests" on public.guests;
create policy "Authenticated can insert guests"
on public.guests for insert to authenticated
with check (true);

drop policy if exists "Authenticated can update guests" on public.guests;
create policy "Authenticated can update guests"
on public.guests for update to authenticated
using (true) with check (true);

drop policy if exists "Authenticated can delete guests" on public.guests;
create policy "Authenticated can delete guests"
on public.guests for delete to authenticated
using (true);

commit;

-- Audit opsional:
select id,name,guest_slug,template_id,rsvp_status,created_at
from public.guests
order by created_at asc nulls last,id;
