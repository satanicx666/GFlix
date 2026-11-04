create type public.app_role as enum ('admin', 'moderator', 'user');
create type public.membership_tier as enum ('free', 'premium');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  membership_tier public.membership_tier not null default 'free',
  premium_until timestamptz,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_premium(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = _user_id and premium_until is not null and premium_until > now()) $$;

create policy "own profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "admin profile update" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "own roles read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "admin roles insert" on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "admin roles delete" on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- signup: profile + role; very first user becomes admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie','tv')),
  title text not null,
  poster_path text,
  created_at timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type)
);
grant select, insert, delete on public.watchlist to authenticated;
grant all on public.watchlist to service_role;
alter table public.watchlist enable row level security;
create policy "own watchlist" on public.watchlist for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.server_config (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text not null,
  is_active boolean not null default true,
  priority integer not null default 100,
  premium_only boolean not null default false,
  last_latency_ms integer,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.server_config to authenticated;
grant insert, update, delete on public.server_config to authenticated;
grant all on public.server_config to service_role;
alter table public.server_config enable row level security;
create policy "members read servers" on public.server_config for select to authenticated using (true);
create policy "admin write servers" on public.server_config for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.licensed_videos (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie','tv')),
  season integer,
  episode integer,
  server_id uuid not null references public.server_config(id) on delete cascade,
  path text not null,
  quality text not null default '720p',
  title text,
  created_at timestamptz not null default now()
);
create index on public.licensed_videos (tmdb_id, media_type);
grant select, insert, update, delete on public.licensed_videos to authenticated;
grant all on public.licensed_videos to service_role;
alter table public.licensed_videos enable row level security;
create policy "members read allowed videos" on public.licensed_videos for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or exists (
      select 1 from public.server_config s
      where s.id = server_id and s.is_active
        and (not s.premium_only or public.is_premium(auth.uid()))
    )
  );
create policy "admin write videos" on public.licensed_videos for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.title_available(_tmdb_id integer, _media_type text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.licensed_videos v join public.server_config s on s.id = v.server_id
  where v.tmdb_id = _tmdb_id and v.media_type = _media_type and s.is_active) $$;
grant execute on function public.title_available(integer, text) to anon, authenticated;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan text not null,
  amount_idr integer not null,
  stripe_session_id text unique,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "own or admin payments" on public.payments for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target_id text,
  created_at timestamptz not null default now()
);
grant select, insert on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;
alter table public.admin_audit_log enable row level security;
create policy "admin read audit" on public.admin_audit_log for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "admin insert audit" on public.admin_audit_log for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') and admin_id = auth.uid());
