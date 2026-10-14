-- Phase 10: credit card bills and installments.

-- Card settings ---------------------------------------------------------------
-- A bill closes on closing_day (clamped to short months) and is due on due_day. Purchases
-- on the closing day already belong to the next bill. Only cards carry these fields; older
-- cards may have none until the user fills them in.

alter table public.accounts
  add column closing_day smallint check (closing_day between 1 and 31),
  add column due_day smallint check (due_day between 1 and 31),
  add column credit_limit numeric(14, 2) check (credit_limit > 0),
  add constraint card_settings_only_on_cards check (
    type = 'credit_card' or (closing_day is null and due_day is null and credit_limit is null)
  ),
  add constraint card_days_together check ((closing_day is null) = (due_day is null));

-- Installments ------------------------------------------------------------------
-- "12x de R$ 150" is 12 transactions sharing installment_group_id, one per month.
-- Imported statements may only say "Parcela 3/12", so the group is optional.

alter table public.transactions
  add column installment_group_id uuid,
  add column installment_number smallint,
  add column installment_count smallint,
  add constraint installment_fields_together check ((installment_number is null) = (installment_count is null)),
  add constraint installment_number_in_range check (
    installment_number is null or (installment_count between 2 and 48 and installment_number between 1 and installment_count)
  ),
  add constraint installment_group_has_number check (installment_group_id is null or installment_number is not null);

create index transactions_installment_group_idx on public.transactions (installment_group_id)
  where installment_group_id is not null;

-- Balances view gains the card settings (appended, so existing columns keep their order).
create or replace view public.account_balances
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
  coalesce(m.transaction_count, 0)::int as transaction_count,
  a.closing_day,
  a.due_day,
  a.credit_limit
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
    select transfer_account_id, 'income'::public.transaction_type, amount
    from public.transactions
    where type = 'transfer'
  ) movements
  group by account_id
) m on m.account_id = a.id;

-- Demo -------------------------------------------------------------------------
-- The demo card closes on the 1st (so each bill is one calendar month) and is due on the
-- 10th. Two purchases in installments, and bill payments recomputed to match the bills.

create function private.seed_demo_cards(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card uuid;
  v_itau uuid;
  v_today date := private.today_sp();
  v_month date;
  v_total numeric;
  v_group uuid;
  v_category uuid;
  i int;
begin
  select id into v_card from public.accounts where user_id = p_user_id and type = 'credit_card' limit 1;
  select id into v_itau from public.accounts where user_id = p_user_id and name = 'Itaú' limit 1;
  if v_card is null or v_itau is null then
    return;
  end if;

  update public.accounts set closing_day = 1, due_day = 10, credit_limit = 8000 where id = v_card;

  select id into v_category from public.categories
  where user_id = p_user_id and kind = 'expense' and name = 'Compras';

  -- Notebook in 10x, bought three months ago; fridge in 6x, bought last month.
  v_group := gen_random_uuid();
  insert into public.transactions
    (user_id, type, account_id, category_id, amount, date, description,
     installment_group_id, installment_number, installment_count)
  select p_user_id, 'expense', v_card, v_category, 360, (date_trunc('month', v_today) - interval '3 months')::date + 14
      + make_interval(months => n - 1), 'Notebook', v_group, n, 10
  from generate_series(1, 10) as n;

  v_group := gen_random_uuid();
  insert into public.transactions
    (user_id, type, account_id, category_id, amount, date, description,
     installment_group_id, installment_number, installment_count)
  select p_user_id, 'expense', v_card, v_category, 400, (date_trunc('month', v_today) - interval '1 month')::date + 20
      + make_interval(months => n - 1), 'Geladeira', v_group, n, 6
  from generate_series(1, 6) as n;

  -- Pay every bill already due, in full, on its due date.
  delete from public.transactions
  where user_id = p_user_id and type = 'transfer' and transfer_account_id = v_card;

  for i in 0..6 loop
    v_month := (date_trunc('month', v_today) - make_interval(months => 6 - i))::date;
    exit when v_month + interval '1 month 9 days' > v_today;

    select coalesce(sum(case when type = 'expense' then amount else -amount end), 0) into v_total
    from public.transactions
    where user_id = p_user_id and account_id = v_card and type <> 'transfer'
      and date >= v_month and date < (v_month + interval '1 month')::date;

    if v_total > 0 then
      insert into public.transactions (user_id, type, account_id, transfer_account_id, amount, date, description)
      values (p_user_id, 'transfer', v_itau, v_card, v_total, (v_month + interval '1 month 9 days')::date,
        'Pagamento da fatura');
    end if;
  end loop;
end;
$$;

revoke all on function private.seed_demo_cards from public;

create or replace function private.reset_demo_accounts()
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
    perform private.seed_demo_cards(v_user);
    perform private.seed_demo_investments(v_user);
    perform private.seed_demo_fixed_income(v_user);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function private.reset_demo_accounts from public;
