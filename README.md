# POPUP.NYC

An editorial guide to real New York pop-ups, plus Daily Drop: a feed of clearly labeled fictional AI pop-up concepts that members can reveal and vote on.

## Local development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Keep these values in `.env.local` locally and in the Vercel project settings for deployment. `.env.local` is ignored by Git.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
SUPABASE_SECRET_KEY=
CRON_SECRET=
```

`GEMINI_MODEL` is optional; the value above is the application default. `SUPABASE_SECRET_KEY` and `CRON_SECRET` are server-only secrets and must never use a `NEXT_PUBLIC_` prefix.

## Database setup

Run the SQL files in [`supabase/migrations`](supabase/migrations) in filename order. They create the generations and votes tables, allow five daily concepts, enable RLS, restrict Daily Drop data to authenticated members, and add the automatic popup-sync fields. Explore remains public, but expired or inactive popup rows are hidden by RLS.

## Automatic popup updates

Vercel calls `/api/cron/sync-popups` once a day at `10:00 UTC`. The secured route reads the current listings from NYC for FREE and VIP Sample Sale, follows their event links, rejects rows without exact dates, and upserts the normalized events into Supabase. Existing manually curated rows are not deleted. The scraper identifies itself, respects the sources' published robots rules, limits concurrency, and skips a source safely when its structure is unavailable.

Before deploying:

1. Run `supabase/migrations/20261007000000_automatic_popup_sync.sql` in Supabase.
2. Add `SUPABASE_SECRET_KEY` and a random `CRON_SECRET` of at least 16 characters in Vercel.
3. Keep `GEMINI_API_KEY` configured for Daily Drop; real-event syncing does not use Gemini.

The homepage also filters `end_date` on every request, so expired listings disappear even if a scheduled sync is delayed.

## Checks

```bash
npm run lint
npm run build
```
