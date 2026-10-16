-- Follow-up migration for projects where the first shared-daily-concepts
-- migration was run before its final RLS and constraint changes were added.
-- Every statement is safe to run after the original migration.

alter table public.ai_generations
drop constraint if exists ai_generations_creator_id_generated_on_key;

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
