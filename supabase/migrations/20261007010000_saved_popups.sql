create table if not exists public.saved_popups (
  user_id uuid not null references auth.users(id) on delete cascade,
  popup_id bigint not null references public.popups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, popup_id)
);

alter table public.saved_popups enable row level security;

drop policy if exists "Members can read their own saved popups" on public.saved_popups;
drop policy if exists "Members can save popups" on public.saved_popups;
drop policy if exists "Members can remove their own saved popups" on public.saved_popups;

create policy "Members can read their own saved popups"
on public.saved_popups for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Members can save popups"
on public.saved_popups for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Members can remove their own saved popups"
on public.saved_popups for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.saved_popups from anon;
grant select, insert, delete on public.saved_popups to authenticated;

create index if not exists saved_popups_user_created_at_idx
on public.saved_popups (user_id, created_at desc);
