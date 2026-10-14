-- Phase 12: AI insights. The model only reads data through the app (with the user's own
-- client, so RLS applies); these tables hold usage for the daily limit and cached results.

-- One row per call to the model, for the per-user daily limit and cost tracking.
-- Users can read and add their own rows, never edit or delete them.
create table public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('summary', 'question')),
  input_tokens int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  created_at timestamptz not null default now()
);

create index ai_requests_user_created_idx on public.ai_requests (user_id, created_at desc);

alter table public.ai_requests enable row level security;

create policy "Users read their own AI requests" on public.ai_requests
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users log their own AI requests" on public.ai_requests
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Cached results: the month summary and answers to the suggested questions, per day.
create table public.ai_results (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 80),
  day date not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key, day)
);

alter table public.ai_results enable row level security;

create policy "Users read their own AI results" on public.ai_results
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users save their own AI results" on public.ai_results
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users refresh their own AI results" on public.ai_results
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Old cached results are useless after a few days (daily at 04:45 in São Paulo).
select cron.schedule(
  'finora-prune-ai-results',
  '45 7 * * *',
  $$delete from public.ai_results where day < (now() at time zone 'America/Sao_Paulo')::date - 7$$
);
