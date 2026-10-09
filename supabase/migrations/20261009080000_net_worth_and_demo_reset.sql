-- Phase 8: month-end account balances for the net worth chart, and a nightly demo reset.

-- Sum of active account balances at the end of each of the last p_months months
-- (the current month ends today). Transfers move money between the user's own
-- accounts, so each side is counted on its account. RLS applies (security invoker).
create function public.balance_history(p_months int)
returns table (month date, balance numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with today as (
    select (now() at time zone 'America/Sao_Paulo')::date as d
  ),
  months as (
    select
      (date_trunc('month', t.d) - make_interval(months => g))::date as month_start,
      least((date_trunc('month', t.d) - make_interval(months => g) + interval '1 month - 1 day')::date, t.d) as month_end
    from today t, generate_series(0, greatest(least(p_months, 36), 1) - 1) as g
  ),
  active as (
    select id, initial_balance from public.accounts where not archived
  ),
  movements as (
    select t.account_id as account_id, t.date,
      case when t.type = 'income' then t.amount else -t.amount end as delta
    from public.transactions t
    union all
    select t.transfer_account_id, t.date, t.amount
    from public.transactions t
    where t.type = 'transfer'
  )
  select
    m.month_start,
    (select coalesce(sum(a.initial_balance), 0) from active a)
      + (select coalesce(sum(mv.delta), 0) from movements mv join active a on a.id = mv.account_id where mv.date <= m.month_end)
  from months m
  order by m.month_start;
$$;

revoke all on function public.balance_history from public, anon;
grant execute on function public.balance_history to authenticated;

-- Resets every demo account to its sample data, so the public demo stays tidy.
create function private.reset_demo_accounts()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_count int := 0;
begin
  for v_user in select id from public.profiles where is_demo loop
    perform private.seed_demo_data(v_user);
    perform private.seed_demo_investments(v_user);
    perform private.seed_demo_fixed_income(v_user);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function private.reset_demo_accounts from public;

-- Every night at 04:00 in São Paulo (07:00 UTC), after the recurring job.
select cron.schedule('finora-reset-demo', '0 7 * * *', 'select private.reset_demo_accounts()');
