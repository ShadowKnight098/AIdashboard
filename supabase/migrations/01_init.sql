-- ==============================================================================
-- TechScroll AI — Supabase Database Migration
-- Real Auth with auth.uid() RLS policies
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. PROFILES TABLE (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. REELS TABLE
create table if not exists public.reels (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  transcript text not null default '',
  category text not null check (
    category in ('AI', 'DSA', 'Java', 'HLD', 'Cybersecurity', 'Cloud', 'Hardware', 'Career', 'WebDev', 'DevOps')
  ),
  difficulty text not null check (
    difficulty in ('Beginner', 'Intermediate', 'Advanced')
  ),
  thumbnail_url text,
  source_url text,
  video_url text not null,
  duration_seconds numeric default 30 not null,
  format text not null check (
    format in ('Meme', 'Vlog', 'Comparison', 'Explainer', 'News', 'Tutorial')
  ),
  educational_value integer not null default 50 check (educational_value between 0 and 100),
  hype_score integer not null default 20 check (hype_score between 0 and 100),
  is_candidate boolean default true not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_reels_is_candidate on public.reels (is_candidate);
create index if not exists idx_reels_category on public.reels (category);

-- 4. INTERACTIONS TABLE
create table if not exists public.interactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  reel_id uuid references public.reels(id) on delete cascade not null,
  watch_percentage numeric not null default 0 check (watch_percentage between 0 and 100),
  liked boolean default false not null,
  saved boolean default false not null,
  shared boolean default false not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint uq_user_reel unique (user_id, reel_id)
);

create index if not exists idx_interactions_user_id on public.interactions (user_id);

-- 5. INTEREST PROFILES TABLE
create table if not exists public.interest_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  interest_label text not null,
  score integer not null default 50 check (score between 0 and 100),
  confidence text not null check (confidence in ('High', 'Medium', 'Low')),
  evidence jsonb default '[]'::jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_interest_profiles_user_id on public.interest_profiles (user_id);

-- 6. RECOMMENDATIONS TABLE
create table if not exists public.recommendations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  current_reel_id uuid references public.reels(id) on delete set null,
  interest_detected text not null,
  why text not null,
  recommended_reel_id uuid references public.reels(id) on delete cascade not null,
  category text not null,
  why_this_recommendation text not null,
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  confidence text not null check (confidence in ('High', 'Medium', 'Low')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_recommendations_user_id on public.recommendations (user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY — user sees ONLY their own data
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.reels enable row level security;
alter table public.interactions enable row level security;
alter table public.interest_profiles enable row level security;
alter table public.recommendations enable row level security;

-- Profiles: read own, insert/update own
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Reels: everyone can read, authenticated users can insert
create policy "Reels are publicly readable" on public.reels
  for select using (true);
create policy "Authenticated users can upload reels" on public.reels
  for insert with check (auth.uid() = uploaded_by);

-- Interactions: only own
create policy "Users read own interactions" on public.interactions
  for select using (auth.uid() = user_id);
create policy "Users insert own interactions" on public.interactions
  for insert with check (auth.uid() = user_id);
create policy "Users update own interactions" on public.interactions
  for update using (auth.uid() = user_id);

-- Interest Profiles: only own
create policy "Users read own profiles" on public.interest_profiles
  for select using (auth.uid() = user_id);
create policy "Users insert own profiles" on public.interest_profiles
  for insert with check (auth.uid() = user_id);

-- Recommendations: only own
create policy "Users read own recommendations" on public.recommendations
  for select using (auth.uid() = user_id);
create policy "Users insert own recommendations" on public.recommendations
  for insert with check (auth.uid() = user_id);

-- ==============================================================================
-- STORAGE BUCKET FOR VIDEO UPLOADS
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('reels-videos', 'reels-videos', true)
on conflict (id) do nothing;

-- Anyone can read uploaded videos
create policy "Reels videos are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'reels-videos' );

-- Authenticated users can upload videos
create policy "Authenticated users can upload videos"
  on storage.objects for insert
  with check ( bucket_id = 'reels-videos' and auth.role() = 'authenticated' );

-- ==============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    null
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop if exists to avoid conflicts on re-run
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
