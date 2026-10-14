-- Phase 9: error monitoring without a third-party service.
-- Server errors (instrumentation onRequestError) and browser errors land here through
-- report_error(). The table lives in the private schema, so the public API cannot read it;
-- `npm run errors` lists the latest events.

create table private.error_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null check (source in ('server', 'client')),
  message text not null,
  digest text,
  -- Pathname only: query strings can carry search terms.
  path text,
  route text,
  context text,
  -- No foreign key: an event outlives the user who hit it.
  user_id uuid,
  user_agent text
);

create index error_events_created_at_idx on private.error_events (created_at desc);

-- Anyone may report (errors happen before sign-in too), so inputs are trimmed and a
-- global cap of 60 events per minute keeps a flood from filling the table.
create function public.report_error(
  p_source text,
  p_message text,
  p_digest text default null,
  p_path text default null,
  p_route text default null,
  p_context text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_source not in ('server', 'client') or coalesce(trim(p_message), '') = '' then
    return;
  end if;

  if (select count(*) from private.error_events where created_at > now() - interval '1 minute') >= 60 then
    return;
  end if;

  insert into private.error_events (source, message, digest, path, route, context, user_id, user_agent)
  values (
    p_source,
    left(p_message, 1000),
    left(p_digest, 64),
    left(split_part(p_path, '?', 1), 300),
    left(p_route, 200),
    left(p_context, 200),
    auth.uid(),
    left(p_user_agent, 300)
  );
end;
$$;

revoke all on function public.report_error from public;
grant execute on function public.report_error to anon, authenticated;

-- Keep 30 days of history (daily at 04:30 in São Paulo).
select cron.schedule(
  'finora-prune-errors',
  '30 7 * * *',
  $$delete from private.error_events where created_at < now() - interval '30 days'$$
);
