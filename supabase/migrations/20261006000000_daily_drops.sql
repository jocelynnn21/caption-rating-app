create extension if not exists pgcrypto;

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  title text not null,
  collaboration text not null,
  concept text not null,
  hook text not null,
  neighborhood text not null,
  category text not null,
  model text not null,
  generated_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (creator_id, generated_on)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.ai_generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (generation_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.popups enable row level security;
alter table public.ai_generations enable row level security;
alter table public.votes enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Popups are publicly readable" on public.popups;
drop policy if exists "AI generations are publicly readable" on public.ai_generations;
drop policy if exists "Members can create their own generation" on public.ai_generations;
drop policy if exists "Creators can delete their own generation" on public.ai_generations;
drop policy if exists "Votes are publicly readable" on public.votes;
drop policy if exists "Members can create their own vote" on public.votes;
drop policy if exists "Members can update their own vote" on public.votes;
drop policy if exists "Members can delete their own vote" on public.votes;

create policy "Profiles are publicly readable"
on public.profiles for select
using (true);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Popups are publicly readable"
on public.popups for select
using (true);

create policy "AI generations are publicly readable"
on public.ai_generations for select
using (true);

create policy "Members can create their own generation"
on public.ai_generations for insert
to authenticated
with check ((select auth.uid()) = creator_id);

create policy "Creators can delete their own generation"
on public.ai_generations for delete
to authenticated
using ((select auth.uid()) = creator_id);

create policy "Votes are publicly readable"
on public.votes for select
using (true);

create policy "Members can create their own vote"
on public.votes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Members can update their own vote"
on public.votes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Members can delete their own vote"
on public.votes for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists ai_generations_created_at_idx
on public.ai_generations (created_at desc);

create index if not exists votes_generation_id_idx
on public.votes (generation_id);
