-- How the user has categorized each description before, for import suggestions.
-- security invoker: RLS keeps it to the caller's own transactions.

create function public.category_history()
returns table (description text, category_id uuid, kind public.category_kind, transaction_count int)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.description, t.category_id, c.kind, count(*)::int
  from public.transactions t
  join public.categories c on c.id = t.category_id
  where t.type in ('income', 'expense')
  group by t.description, t.category_id, c.kind
  order by count(*) desc
  limit 2000;
$$;

revoke all on function public.category_history from public, anon;
grant execute on function public.category_history to authenticated;
