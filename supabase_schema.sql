-- ============================================================
-- CHALK Fantasy Sports Betting — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  avatar_color text default '#3b82f6',
  created_at timestamptz default now()
);

-- Leagues
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid references public.profiles(id) on delete cascade,
  starting_balance numeric default 1000,
  duration_days int default 7,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  created_at timestamptz default now()
);

-- League members
create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  balance numeric default 1000,
  joined_at timestamptz default now(),
  unique(league_id, user_id)
);

-- Games (mock/admin-seeded)
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  home_team text not null,
  away_team text not null,
  home_record text default '',
  away_record text default '',
  league text not null,
  game_time text not null,
  is_live boolean default false,
  ml_home int not null,
  ml_away int not null,
  spread_home numeric not null,
  spread_away numeric not null,
  status text default 'upcoming', -- upcoming | live | final
  winner text default null,       -- home | away | null
  created_at timestamptz default now()
);

-- Bets
create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  pick_label text not null,
  bet_type text not null,         -- moneyline | spread
  odds int not null,
  wager numeric not null,
  potential_payout numeric not null,
  status text default 'active',   -- active | won | lost
  created_at timestamptz default now()
);

-- ============================================================
-- Enable Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.games enable row level security;
alter table public.bets enable row level security;

-- Profiles: users can read all, only update their own
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Leagues: anyone can read; authenticated users can create
create policy "leagues_select" on public.leagues for select using (true);
create policy "leagues_insert" on public.leagues for insert with check (auth.uid() = created_by);

-- League members: read all; insert own membership
create policy "members_select" on public.league_members for select using (true);
create policy "members_insert" on public.league_members for insert with check (auth.uid() = user_id);
create policy "members_update" on public.league_members for update using (auth.uid() = user_id);

-- Games: public read; no client writes (admin only via service key)
create policy "games_select" on public.games for select using (true);

-- Bets: read own bets + league-mates; insert own
create policy "bets_select" on public.bets for select using (
  auth.uid() = user_id or
  league_id in (select league_id from public.league_members where user_id = auth.uid())
);
create policy "bets_insert" on public.bets for insert with check (auth.uid() = user_id);

-- ============================================================
-- Helper function: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 6)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Seed mock games
-- ============================================================
insert into public.games (home_team, away_team, home_record, away_record, league, game_time, is_live, ml_home, ml_away, spread_home, spread_away) values
('Chiefs',       'Raiders',      '11-3', '5-9',  'NFL', 'Sun 4:25 PM',  false, -220, 185,  -5.5, 5.5),
('Lakers',       'Celtics',      '28-20','35-12', 'NBA', 'LIVE · Q3',    true,   135, -160,  3.5,-3.5),
('Yankees',      'Red Sox',      '12-8', '9-11',  'MLB', 'Today 7:10 PM',false, -145, 125,  -1.5, 1.5),
('Maple Leafs',  'Bruins',       '31-19','33-17', 'NHL', 'Today 7:30 PM',false,  110,-130,   0.5,-0.5);
