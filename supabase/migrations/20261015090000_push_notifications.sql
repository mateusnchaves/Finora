-- Phase 13: push notifications (bill due soon, budget over its limit, goal reached).
-- A daily job (Vercel Cron → /api/cron/notify) reads these with the secret key; users only
-- manage their own subscriptions.

-- One row per device that allowed notifications.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- What was already sent, so each alert goes out once (e.g. one per bill, per budget a month).
create table public.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bill_due', 'budget_over', 'goal_reached')),
  ref text not null check (char_length(ref) <= 120),
  sent_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);

alter table public.notification_log enable row level security;

create policy "Users read their own notification log" on public.notification_log
  for select to authenticated using (user_id = (select auth.uid()));

-- Keep 90 days of history (daily at 05:00 in São Paulo).
select cron.schedule(
  'finora-prune-notification-log',
  '0 8 * * *',
  $$delete from public.notification_log where sent_at < now() - interval '90 days'$$
);
