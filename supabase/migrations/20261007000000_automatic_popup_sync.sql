alter table public.popups
  add column if not exists image_url text,
  add column if not exists source_key text,
  add column if not exists source_provider text not null default 'manual',
  add column if not exists source_title text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists is_active boolean not null default true;

create unique index if not exists popups_source_key_idx
on public.popups (source_key);

create index if not exists popups_active_end_date_idx
on public.popups (is_active, end_date);

alter table public.popups enable row level security;

drop policy if exists "Popups are publicly readable" on public.popups;

create policy "Current popups are publicly readable"
on public.popups for select
to anon, authenticated
using (
  is_active = true
  and coalesce(end_date, start_date) >= (now() at time zone 'America/New_York')::date
);

revoke insert, update, delete on public.popups from anon, authenticated;
grant select on public.popups to anon, authenticated;
