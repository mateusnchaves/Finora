-- monthly_totals must only count days inside [p_from, p_to), so a partial range
-- (1–8 Sep, to compare with 1–8 Oct) is not widened to the whole month.

create or replace function public.monthly_totals(p_from date, p_to date)
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
    and t.date >= p_from and t.date < p_to
  group by m
  order by m;
$$;
