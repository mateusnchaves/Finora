-- Aggregates for the dashboard. Both run as the caller (security invoker), so RLS limits
-- them to the signed-in user's rows; summing in Postgres avoids the API's 1,000-row cap.

-- Income and expense totals per month in [p_from, p_to), including months with no movement.
create function public.monthly_totals(p_from date, p_to date)
returns table (month date, income numeric, expenses numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    m::date as month,
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0) as income,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as expenses
  from generate_series(date_trunc('month', p_from), p_to - interval '1 day', interval '1 month') as m
  left join public.transactions t
    on t.date >= m and t.date < m + interval '1 month'
  group by m
  order by m;
$$;

-- Expense totals per category in [p_from, p_to), largest first. category_id is null for
-- uncategorized expenses.
create function public.expense_category_totals(p_from date, p_to date)
returns table (category_id uuid, category_name text, total numeric, transaction_count int)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.name, sum(t.amount), count(*)::int
  from public.transactions t
  left join public.categories c on c.id = t.category_id
  where t.type = 'expense' and t.date >= p_from and t.date < p_to
  group by c.id, c.name
  order by sum(t.amount) desc;
$$;

revoke all on function public.monthly_totals, public.expense_category_totals from public, anon;
grant execute on function public.monthly_totals, public.expense_category_totals to authenticated;
