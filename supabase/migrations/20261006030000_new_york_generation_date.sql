alter table public.ai_generations
alter column generated_on
set default ((now() at time zone 'America/New_York')::date);
