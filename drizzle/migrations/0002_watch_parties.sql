create table public.watch_parties (
  code text primary key,
  host_id uuid not null,
  media_type text not null check (media_type in ('movie','tv')),
  tmdb_id integer not null,
  season integer,
  episode integer,
  title text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.watch_parties to authenticated;
grant all on public.watch_parties to service_role;
alter table public.watch_parties enable row level security;
create policy "members read parties" on public.watch_parties for select to authenticated using (true);
create policy "host creates party" on public.watch_parties for insert to authenticated with check (host_id = auth.uid());
create policy "host deletes party" on public.watch_parties for delete to authenticated using (host_id = auth.uid());