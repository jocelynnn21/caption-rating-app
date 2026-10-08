alter table public.ai_generations
drop constraint if exists ai_generations_creator_id_generated_on_key;

create index if not exists ai_generations_creator_day_idx
on public.ai_generations (creator_id, generated_on);
