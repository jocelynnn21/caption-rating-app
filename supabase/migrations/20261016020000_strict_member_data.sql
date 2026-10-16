-- Keep individual votes private, make AI concepts server-authored, and prevent
-- direct clients from saving expired or inactive pop-ups.

alter table public.votes enable row level security;

drop policy if exists "Votes are publicly readable" on public.votes;
drop policy if exists "Members can read votes" on public.votes;
drop policy if exists "Members can read their own votes" on public.votes;

create policy "Members can read their own votes"
on public.votes for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.get_vote_summaries(generation_ids uuid[])
returns table (
  generation_id uuid,
  go_count bigint,
  skip_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    votes.generation_id,
    count(*) filter (where votes.value = 1) as go_count,
    count(*) filter (where votes.value = -1) as skip_count
  from public.votes as votes
  inner join public.ai_generations as generations
    on generations.id = votes.generation_id
  where
    (select auth.uid()) is not null
    and cardinality(generation_ids) between 1 and 5
    and votes.generation_id = any(generation_ids)
    and generations.daily_slot between 1 and 5
    and generations.generated_on = ((now() at time zone 'America/New_York')::date)
  group by votes.generation_id;
$$;

revoke all on function public.get_vote_summaries(uuid[]) from public, anon;
grant execute on function public.get_vote_summaries(uuid[]) to authenticated;

drop policy if exists "Members can create their own generation" on public.ai_generations;
drop policy if exists "Members can create today's shared generations" on public.ai_generations;
revoke insert, update, delete on public.ai_generations from authenticated;
grant select on public.ai_generations to authenticated;

drop policy if exists "Members can save popups" on public.saved_popups;

create policy "Members can save current popups"
on public.saved_popups for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.popups
    where popups.id = popup_id
      and popups.is_active = true
      and coalesce(popups.end_date, popups.start_date) >=
        ((now() at time zone 'America/New_York')::date)
  )
);

revoke all on public.saved_popups from anon;
grant select, insert, delete on public.saved_popups to authenticated;
