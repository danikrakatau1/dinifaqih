-- =========================================================
-- DINI & FAQIH — UNIVERSAL GUEST + PRETTY URL V2
-- Target project: jfvmcerrsxjvbiogfqes
-- IMPORTANT: jalankan HANYA pada Supabase project DINI & FAQIH.
--
-- Kontrak final:
-- guests -> invitation -> active_template_id -> templates
-- Public URL tetap /rozak, /rozak-2, /rozak-3, dst.
-- Display name tidak berubah karena suffix hanya milik guest_slug.
-- Legacy guests.template_id dipertahankan nullable untuk kompatibilitas.
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1. Invitation / project authority
-- ---------------------------------------------------------
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default 'Dini & Faqih',
  active_template_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invitations add column if not exists active_template_id uuid;

-- Pastikan FK active_template_id benar dan aman ketika template dihapus.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid=c.conrelid
    join pg_namespace n on n.oid=rel.relnamespace
    where n.nspname='public'
      and rel.relname='invitations'
      and c.contype='f'
      and pg_get_constraintdef(c.oid) ilike '%active_template_id%'
  loop
    execute format('alter table public.invitations drop constraint %I',r.conname);
  end loop;
end $$;

alter table public.invitations
  add constraint invitations_active_template_id_fkey
  foreign key (active_template_id) references public.templates(id)
  on update cascade on delete set null;

-- Seed satu project Dini & Faqih. Jika template aktif sudah ada, langsung pakai UUID itu.
insert into public.invitations (slug,title,active_template_id)
select
  'dini-faqih',
  'Dini & Faqih',
  (
    select t.id
    from public.templates t
    order by t.is_active desc, t.updated_at desc nulls last, t.created_at asc nulls last
    limit 1
  )
on conflict (slug) do update
set title=excluded.title,
    active_template_id=coalesce(public.invitations.active_template_id,excluded.active_template_id),
    updated_at=now();

-- Setiap tombol Tampilkan/Activate pada Template Library otomatis mengubah
-- invitation.active_template_id tanpa mengubah link tamu.
create or replace function public.dini_sync_active_template_to_invitation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.is_active is true then
    update public.invitations
    set active_template_id=new.id,
        updated_at=now()
    where slug='dini-faqih';
  end if;
  return new;
end;
$$;

drop trigger if exists dini_sync_active_template_trg on public.templates;
create trigger dini_sync_active_template_trg
after insert or update of is_active
on public.templates
for each row
when (new.is_active is true)
execute function public.dini_sync_active_template_to_invitation();

-- Sinkron awal sekali lagi dari template aktif saat migration dijalankan.
update public.invitations i
set active_template_id=t.id,
    updated_at=now()
from lateral (
  select id
  from public.templates
  where is_active=true
  order by updated_at desc nulls last, created_at asc nulls last
  limit 1
) t
where i.slug='dini-faqih';

-- ---------------------------------------------------------
-- 2. Guest belongs to invitation, not template
-- ---------------------------------------------------------
alter table public.guests add column if not exists guest_slug text;
alter table public.guests add column if not exists invitation_id uuid;
alter table public.guests add column if not exists template_id uuid;

-- Legacy template binding tetap ada hanya sebagai kompatibilitas.
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

-- Backfill semua tamu lama ke project Dini & Faqih.
update public.guests g
set invitation_id=i.id
from public.invitations i
where i.slug='dini-faqih'
  and g.invitation_id is null;

-- Ganti/rapikan FK invitation_id.
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
      and pg_get_constraintdef(c.oid) ilike '%invitation_id%'
  loop
    execute format('alter table public.guests drop constraint %I',r.conname);
  end loop;
end $$;

alter table public.guests
  add constraint guests_invitation_id_fkey
  foreign key (invitation_id) references public.invitations(id)
  on update cascade on delete cascade;

alter table public.guests alter column invitation_id set not null;
create index if not exists guests_invitation_id_idx on public.guests(invitation_id);

-- Duplicate display-name memang diperbolehkan.
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

-- ---------------------------------------------------------
-- 3. Stable pretty slug
-- ---------------------------------------------------------
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

-- Backfill slug lama collision-safe.
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

create or replace function public.dini_assign_guest_contract()
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
  -- Dashboard lama/baru boleh tidak mengirim invitation_id;
  -- database akan mengikatnya otomatis ke project Dini & Faqih.
  if new.invitation_id is null then
    select id into new.invitation_id
    from public.invitations
    where slug='dini-faqih'
    limit 1;
  end if;

  if new.invitation_id is null then
    raise exception 'Invitation Dini & Faqih belum tersedia';
  end if;

  -- Stable URL: edit display name tidak mengubah link lama.
  if tg_op='UPDATE'
     and old.guest_slug is not null
     and btrim(old.guest_slug)<>''
     and (new.guest_slug is null or new.guest_slug=old.guest_slug) then
    new.guest_slug := old.guest_slug;
    return new;
  end if;

  base_slug := public.dini_guest_slug_base(coalesce(nullif(new.guest_slug,''),new.name));

  -- Serialize slug allocation untuk mencegah race Rozak/Rozak pada saat bersamaan.
  perform pg_advisory_xact_lock(hashtextextended(base_slug,0));

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
drop trigger if exists dini_assign_guest_contract_trg on public.guests;
create trigger dini_assign_guest_contract_trg
before insert or update of guest_slug,name,invitation_id
on public.guests
for each row
execute function public.dini_assign_guest_contract();

alter table public.guests alter column guest_slug set not null;

-- ---------------------------------------------------------
-- 4. Public exact resolver (no guest list dump)
-- ---------------------------------------------------------
drop function if exists public.resolve_guest_slug(text);
create function public.resolve_guest_slug(p_slug text)
returns table(
  name text,
  guest_slug text,
  invitation_id uuid,
  active_template_id uuid
)
language sql
stable
security definer
set search_path=public
as $$
  select g.name,g.guest_slug,g.invitation_id,i.active_template_id
  from public.guests g
  join public.invitations i on i.id=g.invitation_id
  where lower(g.guest_slug)=lower(trim(coalesce(p_slug,'')))
  limit 1;
$$;

revoke all on function public.resolve_guest_slug(text) from public;
grant execute on function public.resolve_guest_slug(text) to anon, authenticated;

-- ---------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------
alter table public.invitations enable row level security;
alter table public.guests enable row level security;

drop policy if exists "Authenticated can read invitations" on public.invitations;
create policy "Authenticated can read invitations"
on public.invitations for select to authenticated using (true);

drop policy if exists "Authenticated can insert invitations" on public.invitations;
create policy "Authenticated can insert invitations"
on public.invitations for insert to authenticated with check (true);

drop policy if exists "Authenticated can update invitations" on public.invitations;
create policy "Authenticated can update invitations"
on public.invitations for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated can delete invitations" on public.invitations;
create policy "Authenticated can delete invitations"
on public.invitations for delete to authenticated using (true);

drop policy if exists "Authenticated can read guests" on public.guests;
create policy "Authenticated can read guests"
on public.guests for select to authenticated using (true);

drop policy if exists "Authenticated can insert guests" on public.guests;
create policy "Authenticated can insert guests"
on public.guests for insert to authenticated with check (true);

drop policy if exists "Authenticated can update guests" on public.guests;
create policy "Authenticated can update guests"
on public.guests for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated can delete guests" on public.guests;
create policy "Authenticated can delete guests"
on public.guests for delete to authenticated using (true);

commit;

-- ---------------------------------------------------------
-- Audit setelah RUN
-- ---------------------------------------------------------
select
  i.id as invitation_id,
  i.slug as invitation_slug,
  i.active_template_id,
  t.name as active_template_name,
  t.slug as active_template_slug
from public.invitations i
left join public.templates t on t.id=i.active_template_id
where i.slug='dini-faqih';

select
  g.id,g.name,g.guest_slug,g.invitation_id,g.template_id,g.rsvp_status,g.created_at
from public.guests g
order by g.created_at asc nulls last,g.id;
