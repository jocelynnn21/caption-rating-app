drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "AI generations are publicly readable" on public.ai_generations;
drop policy if exists "Members can read AI generations" on public.ai_generations;
drop policy if exists "Votes are publicly readable" on public.votes;
drop policy if exists "Members can read votes" on public.votes;
drop policy if exists "Members can upload to their avatar folder" on storage.objects;

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Members can read AI generations"
on public.ai_generations for select
to authenticated
using (true);

create policy "Members can read votes"
on public.votes for select
to authenticated
using (true);

create policy "Members can upload to their avatar folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
