create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'Layar Emas',
  description text not null default 'Discover movies and TV shows, keep a watchlist, and stream licensed titles.',
  keywords text not null default 'film, movie, tv, streaming, nonton, film indonesia',
  logo_url text,
  favicon_url text,
  og_image_url text,
  bg_image_url text,
  primary_color text,
  background_color text,
  card_color text,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admin insert settings" on public.site_settings for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admin update settings" on public.site_settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "admins manage branding" on storage.objects for all to authenticated
  using (bucket_id = 'branding' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'branding' and public.has_role(auth.uid(), 'admin'));