-- DINI ANIF — GUESTS PER TEMPLATE UUID SAFE
-- Aman untuk schema templates.id = uuid dan guests.template_id = uuid.

alter table public.templates add column if not exists source_path text;
alter table public.templates add column if not exists is_active boolean not null default false;
alter table public.guests add column if not exists template_id uuid;

-- Template 1 harus memakai UUID asli, BUKAN string 'template-1'.
insert into public.templates (id,name,slug,source_path,status,is_active)
select gen_random_uuid(),'Template 1','template-1','/','active',true
where not exists (select 1 from public.templates where slug='template-1');

-- Jika belum ada template aktif, aktifkan Template 1.
update public.templates
set is_active=true,status='active',updated_at=now()
where slug='template-1'
  and not exists (select 1 from public.templates where is_active=true);

-- Tamu legacy yang belum punya template diarahkan ke template aktif.
update public.guests g
set template_id=t.id
from (
  select id from public.templates
  where is_active=true
  order by created_at asc nulls last
  limit 1
) t
where g.template_id is null;

create index if not exists guests_template_id_idx on public.guests(template_id);

-- FK dibuat hanya jika belum ada constraint yang mengikat guests.template_id.
do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class r on r.oid=c.conrelid
    where r.relname='guests' and c.contype='f'
      and pg_get_constraintdef(c.oid) like '%template_id%templates%'
  ) then
    alter table public.guests
      add constraint guests_template_id_fkey
      foreign key (template_id) references public.templates(id)
      on update cascade on delete restrict;
  end if;
end $$;

alter table public.guests enable row level security;
drop policy if exists "Authenticated can read guests" on public.guests;
create policy "Authenticated can read guests" on public.guests for select to authenticated using (true);
drop policy if exists "Authenticated can insert guests" on public.guests;
create policy "Authenticated can insert guests" on public.guests for insert to authenticated with check (true);
drop policy if exists "Authenticated can update guests" on public.guests;
create policy "Authenticated can update guests" on public.guests for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated can delete guests" on public.guests;
create policy "Authenticated can delete guests" on public.guests for delete to authenticated using (true);

select id,name,slug,is_active from public.templates order by created_at asc;
