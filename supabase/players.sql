-- Player approval: new accounts wait until an admin approves them. Run after billboards.sql. Safe to run again.
-- Nothing is locked until at least one admin exists in sc_admins, so you cannot lock yourself out.

create table if not exists public.sc_players (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  name text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'blocked')),
  created_at timestamptz not null default now()
);
alter table public.sc_players enable row level security;
revoke all on public.sc_players from anon, authenticated;
grant select on public.sc_players to authenticated;
grant update (status) on public.sc_players to authenticated;   -- rows are only created by sc_join()

drop policy if exists "players read" on public.sc_players;
create policy "players read" on public.sc_players for select to authenticated
  using (user_id = (select auth.uid()) or (select public.sc_is_admin()));

drop policy if exists "players admin update" on public.sc_players;
create policy "players admin update" on public.sc_players for update to authenticated
  using ((select public.sc_is_admin())) with check ((select public.sc_is_admin()));

create or replace function public.sc_is_approved() returns boolean
language sql stable security definer set search_path = '' as
$$ select not exists (select 1 from public.sc_admins)
       or public.sc_is_admin()
       or exists (select 1 from public.sc_players p where p.user_id = (select auth.uid()) and p.status = 'approved') $$;
revoke all on function public.sc_is_approved() from public, anon;
grant execute on function public.sc_is_approved() to authenticated;

-- the game calls this after login: registers the player (email comes from the login, never from the browser)
create or replace function public.sc_join(p_name text) returns text
language plpgsql security definer set search_path = '' as
$$
declare uid uuid := auth.uid(); s text;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return 'login'; end if;
  insert into public.sc_players (user_id, email, name)
    select uid, coalesce(u.email, ''), left(btrim(coalesce(p_name, '')), 40) from auth.users u where u.id = uid
    on conflict (user_id) do update set name = excluded.name;
  if public.sc_is_approved() then return 'approved'; end if;
  select p.status into s from public.sc_players p where p.user_id = uid;
  return coalesce(s, 'pending');
end
$$;
revoke all on function public.sc_join(text) from public, anon;
grant execute on function public.sc_join(text) to authenticated;

-- ---------- unapproved accounts can't use the game's data either ----------
-- "restrictive" rules are added on top of the existing ones: both must pass
drop policy if exists "approved profiles insert" on public.sc_profiles;
create policy "approved profiles insert" on public.sc_profiles as restrictive for insert to authenticated with check ((select public.sc_is_approved()));
drop policy if exists "approved profiles update" on public.sc_profiles;
create policy "approved profiles update" on public.sc_profiles as restrictive for update to authenticated using ((select public.sc_is_approved()));
drop policy if exists "approved profiles read" on public.sc_profiles;
create policy "approved profiles read" on public.sc_profiles as restrictive for select to authenticated using (id = (select auth.uid()) or (select public.sc_is_approved()));

drop policy if exists "approved connections insert" on public.sc_connections;
create policy "approved connections insert" on public.sc_connections as restrictive for insert to authenticated with check ((select public.sc_is_approved()));
drop policy if exists "approved messages insert" on public.sc_messages;
create policy "approved messages insert" on public.sc_messages as restrictive for insert to authenticated with check ((select public.sc_is_approved()));
drop policy if exists "approved messages read" on public.sc_messages;
create policy "approved messages read" on public.sc_messages as restrictive for select to authenticated using ((select public.sc_is_approved()));
drop policy if exists "approved spots insert" on public.sc_spot_requests;
create policy "approved spots insert" on public.sc_spot_requests as restrictive for insert to authenticated with check ((select public.sc_is_approved()));
