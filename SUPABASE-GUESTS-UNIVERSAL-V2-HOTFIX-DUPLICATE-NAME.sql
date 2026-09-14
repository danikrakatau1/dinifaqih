-- =========================================================
-- DINI & FAQIH — UNIVERSAL GUEST V2 HOTFIX
-- Remove legacy UNIQUE lower(name) so duplicate display names are allowed.
-- Target project: jfvmcerrsxjvbiogfqes
-- IMPORTANT: jalankan HANYA pada Supabase project DINI & FAQIH.
-- =========================================================

begin;

-- Jika legacy uniqueness dibuat sebagai table constraint, hapus lebih dulu.
do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid=c.conrelid
    join pg_namespace n on n.oid=r.relnamespace
    where n.nspname='public'
      and r.relname='guests'
      and c.contype='u'
      and c.conname='guests_name_lower_unique'
  ) then
    alter table public.guests drop constraint guests_name_lower_unique;
  end if;
end $$;

-- Hapus legacy unique expression index seperti UNIQUE(lower(name)).
-- guest_slug unique TIDAK disentuh.
do $$
declare r record;
begin
  for r in
    select indexname
    from pg_indexes
    where schemaname='public'
      and tablename='guests'
      and indexdef ~* '^CREATE UNIQUE INDEX'
      and indexdef !~* 'guest_slug'
      and (
        indexname='guests_name_lower_unique'
        or indexdef ~* 'lower\s*\(\s*name\s*\)'
      )
  loop
    execute format('drop index if exists public.%I',r.indexname);
  end loop;
end $$;

commit;

-- Audit: setelah hotfix, uniqueness nama harus hilang.
-- Yang tetap boleh UNIQUE adalah guest_slug.
select indexname,indexdef
from pg_indexes
where schemaname='public'
  and tablename='guests'
  and indexdef ~* '^CREATE UNIQUE INDEX'
order by indexname;
