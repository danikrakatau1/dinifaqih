alter table public.wishes enable row level security;
drop policy if exists "Public can read wishes" on public.wishes;
create policy "Public can read wishes" on public.wishes for select to anon using (true);
drop policy if exists "Public can insert wishes" on public.wishes;
create policy "Public can insert wishes" on public.wishes for insert to anon with check (char_length(trim(name)) between 1 and 80 and char_length(trim(message)) between 1 and 1000);
