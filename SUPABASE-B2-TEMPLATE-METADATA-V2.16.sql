-- DINI ANIF — B2 TEMPLATE METADATA V2.16
-- Jalankan sekali di Supabase SQL Editor project Dini Anif.
-- Tidak mengubah renderer/source_path; hanya menambah metadata paket Backblaze B2.

alter table public.templates add column if not exists storage_provider text;
alter table public.templates add column if not exists b2_bucket text;
alter table public.templates add column if not exists b2_object_key text;
alter table public.templates add column if not exists original_filename text;
alter table public.templates add column if not exists file_size bigint;
alter table public.templates add column if not exists mime_type text;
alter table public.templates add column if not exists b2_etag text;
alter table public.templates add column if not exists storage_uploaded_at timestamptz;

create index if not exists templates_b2_object_key_idx on public.templates (b2_object_key) where b2_object_key is not null;

comment on column public.templates.storage_provider is 'Object storage provider for the large template package, e.g. backblaze-b2';
comment on column public.templates.b2_object_key is 'Stable Backblaze B2 object key. Store this instead of temporary signed URLs.';
