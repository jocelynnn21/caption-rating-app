alter table public.ai_generations
add column if not exists daily_slot smallint;

-- The original personal-feed schema allowed one generation per creator/day.
-- Shared sets insert five rows at once, so the slot now owns uniqueness.
alter table public.ai_generations
drop constraint if exists ai_generations_creator_id_generated_on_key;

alter table public.ai_generations
drop constraint if exists ai_generations_daily_slot_check;

alter table public.ai_generations
add constraint ai_generations_daily_slot_check
check (daily_slot is null or daily_slot between 1 and 5);

create unique index if not exists ai_generations_shared_day_slot_idx
on public.ai_generations (generated_on, daily_slot)
where daily_slot is not null;

drop policy if exists "Members can create their own generation" on public.ai_generations;
drop policy if exists "Creators can delete their own generation" on public.ai_generations;
drop policy if exists "Members can create today's shared generations" on public.ai_generations;

create policy "Members can create today's shared generations"
on public.ai_generations for insert
to authenticated
with check (
  (select auth.uid()) = creator_id
  and generated_on = ((now() at time zone 'America/New_York')::date)
  and daily_slot between 1 and 5
);

revoke update, delete on public.ai_generations from authenticated;
grant select, insert on public.ai_generations to authenticated;

-- Votes only belong to the current shared set. The app never deletes votes.
drop policy if exists "Members can create their own vote" on public.votes;
drop policy if exists "Members can update their own vote" on public.votes;
drop policy if exists "Members can delete their own vote" on public.votes;
drop policy if exists "Members can vote on today's shared concepts" on public.votes;
drop policy if exists "Members can change their vote on today's shared concepts" on public.votes;

create policy "Members can vote on today's shared concepts"
on public.votes for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.ai_generations
    where ai_generations.id = generation_id
      and ai_generations.daily_slot between 1 and 5
      and ai_generations.generated_on = ((now() at time zone 'America/New_York')::date)
  )
);

create policy "Members can change their vote on today's shared concepts"
on public.votes for update
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.ai_generations
    where ai_generations.id = generation_id
      and ai_generations.daily_slot between 1 and 5
      and ai_generations.generated_on = ((now() at time zone 'America/New_York')::date)
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.ai_generations
    where ai_generations.id = generation_id
      and ai_generations.daily_slot between 1 and 5
      and ai_generations.generated_on = ((now() at time zone 'America/New_York')::date)
  )
);

revoke delete on public.votes from authenticated;
grant select, insert, update on public.votes to authenticated;

-- Avatar replacement uses a stable per-user object path instead of leaving
-- abandoned files behind, so members need update access to their own folder.
drop policy if exists "Members can update files in their avatar folder" on storage.objects;

create policy "Members can update files in their avatar folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
