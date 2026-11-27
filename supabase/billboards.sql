-- Startup City billboard spots: players request a numbered spot, an admin approves and places it.
-- Run once (Supabase dashboard > SQL Editor). Safe to run again. Touches only sc_* objects.

-- ---------- who is an admin ----------
create table if not exists public.sc_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.sc_admins enable row level security;
revoke all on public.sc_admins from anon, authenticated;   -- no policies: only the SQL editor can change this list

create or replace function public.sc_is_admin() returns boolean
language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.sc_admins a where a.user_id = (select auth.uid())) $$;
revoke all on function public.sc_is_admin() from public, anon;
grant execute on function public.sc_is_admin() to authenticated;

-- ---------- spot requests ----------
create table if not exists public.sc_spot_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  spot text not null check (spot ~ '^[0-9]{2,3}$' and spot::int between 1 and 100),
  startup text not null check (char_length(btrim(startup)) between 2 and 28),
  tagline text not null default '' check (char_length(tagline) <= 60),
  url text not null default '' check (url = '' or (url ~* '^https://[^[:space:]<>"]+$' and char_length(url) <= 120)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
-- (for a table created when there were only 50 spots)
alter table public.sc_spot_requests drop constraint if exists sc_spot_requests_spot_check;
alter table public.sc_spot_requests add constraint sc_spot_requests_spot_check check (spot ~ '^[0-9]{2,3}$' and spot::int between 1 and 100);

-- one startup per spot, and one waiting request per player
create unique index if not exists sc_spot_one_per_spot on public.sc_spot_requests (spot) where status = 'approved';
create unique index if not exists sc_spot_one_pending on public.sc_spot_requests (user_id) where status = 'pending';
create index if not exists sc_spot_user on public.sc_spot_requests (user_id);

alter table public.sc_spot_requests enable row level security;
revoke all on public.sc_spot_requests from anon, authenticated;
grant select (id, spot, startup, tagline, url, status) on public.sc_spot_requests to anon;
grant select, delete on public.sc_spot_requests to authenticated;
grant insert (spot, startup, tagline, url, status) on public.sc_spot_requests to authenticated;  -- user_id always comes from the login
grant update (spot, startup, tagline, url, status) on public.sc_spot_requests to authenticated;

drop policy if exists "spots public approved" on public.sc_spot_requests;
create policy "spots public approved" on public.sc_spot_requests for select to anon
  using (status = 'approved');

drop policy if exists "spots read" on public.sc_spot_requests;
create policy "spots read" on public.sc_spot_requests for select to authenticated
  using (status = 'approved' or user_id = (select auth.uid()) or (select public.sc_is_admin()));

-- players may only ask: pending, as themselves, with a real (not anonymous) account
drop policy if exists "spots request" on public.sc_spot_requests;
create policy "spots request" on public.sc_spot_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending'
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

drop policy if exists "spots admin add" on public.sc_spot_requests;
create policy "spots admin add" on public.sc_spot_requests for insert to authenticated
  with check ((select public.sc_is_admin()));

-- only an admin can approve, reject, rename or move
drop policy if exists "spots admin update" on public.sc_spot_requests;
create policy "spots admin update" on public.sc_spot_requests for update to authenticated
  using ((select public.sc_is_admin())) with check ((select public.sc_is_admin()));

drop policy if exists "spots delete" on public.sc_spot_requests;
create policy "spots delete" on public.sc_spot_requests for delete to authenticated
  using ((select public.sc_is_admin()) or (user_id = (select auth.uid()) and status = 'pending'));

-- ---------- tighten the existing billboard table: the game only reads it ----------
revoke insert, update, delete, truncate on public.sc_billboard from anon, authenticated;

-- ---------- make yourself the admin ----------
-- 1. Dashboard > Authentication > Users > Add user: your real email address and a strong password
--    (tick "Auto Confirm User").
-- 2. Put that email below, remove the two dashes, and run only this statement:
-- insert into public.sc_admins (user_id) select id from auth.users where email = 'YOUR_ADMIN_EMAIL' on conflict do nothing;
