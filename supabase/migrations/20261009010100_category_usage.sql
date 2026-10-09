-- Number of transactions per category, for the categories screen.
-- security_invoker keeps RLS in force, so each user only counts their own rows.

create view public.category_usage
with (security_invoker = true)
as
select category_id, count(*)::int as transaction_count
from public.transactions
where category_id is not null
group by category_id;

grant select on public.category_usage to authenticated;
revoke all on public.category_usage from anon;
