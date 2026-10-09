-- Current balance per account: initial balance + income − expenses − transfers out + transfers in.
-- security_invoker makes the view run with the caller's permissions, so RLS on the
-- underlying tables still limits each user to their own accounts.

create view public.account_balances
with (security_invoker = true)
as
select
  a.id,
  a.user_id,
  a.name,
  a.type,
  a.initial_balance,
  a.archived,
  a.created_at,
  a.initial_balance + coalesce(m.delta, 0) as balance,
  coalesce(m.transaction_count, 0)::int as transaction_count
from public.accounts a
left join (
  select
    account_id,
    sum(case when type = 'income' then amount else -amount end) as delta,
    count(*) as transaction_count
  from (
    select account_id, type, amount
    from public.transactions
    union all
    -- The destination side of a transfer counts as money coming in.
    select transfer_account_id, 'income'::public.transaction_type, amount
    from public.transactions
    where type = 'transfer'
  ) movements
  group by account_id
) m on m.account_id = a.id;

grant select on public.account_balances to authenticated;
revoke all on public.account_balances from anon;
