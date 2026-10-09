-- Phase 4: monthly budgets per expense category and recurring transactions.

-- Budgets ----------------------------------------------------------------------
-- A standing monthly limit per category: "Alimentação: R$ 1.500 por mês".

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null,
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade
);

alter table public.budgets enable row level security;
create policy "Users manage their own budgets" on public.budgets
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Spending against each budget in [p_from, p_to), closest to (or over) the limit first.
create function public.budget_progress(p_from date, p_to date)
returns table (budget_id uuid, category_id uuid, category_name text, amount numeric, spent numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select b.id, c.id, c.name, b.amount, coalesce(sum(t.amount), 0)
  from public.budgets b
  join public.categories c on c.id = b.category_id
  left join public.transactions t
    on t.category_id = b.category_id and t.type = 'expense' and t.date >= p_from and t.date < p_to
  group by b.id, c.id, c.name, b.amount
  order by coalesce(sum(t.amount), 0) / b.amount desc, c.name;
$$;

revoke all on function public.budget_progress from public, anon;
grant execute on function public.budget_progress to authenticated;

-- Recurring rules --------------------------------------------------------------

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type public.transaction_type not null check (type in ('income', 'expense')),
  account_id uuid not null,
  category_id uuid,
  amount numeric(14, 2) not null check (amount > 0),
  description text not null check (char_length(description) between 1 and 120),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  -- Last date already turned into transactions. Deleting a generated transaction
  -- does not bring it back, because generation only moves forward from here.
  generated_until date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);

alter table public.recurring_rules enable row level security;
create policy "Users manage their own recurring rules" on public.recurring_rules
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Users may not move generated_until themselves; only the generator does.
revoke update on public.recurring_rules from authenticated;
grant update (type, account_id, category_id, amount, description, day_of_month, start_date, end_date, active)
  on public.recurring_rules to authenticated;

alter table public.transactions add column recurring_rule_id uuid;
alter table public.transactions
  add foreign key (recurring_rule_id, user_id)
  references public.recurring_rules (id, user_id) on delete set null (recurring_rule_id);
create unique index transactions_recurring_date_idx on public.transactions (recurring_rule_id, date)
  where recurring_rule_id is not null;

-- Generation -------------------------------------------------------------------

-- The rule's day in a given month, clamped to the month's length (31 -> 30 Sep).
create function private.occurrence_date(p_month date, p_day int)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(
    extract(year from p_month)::int,
    extract(month from p_month)::int,
    least(p_day, extract(day from (date_trunc('month', p_month) + interval '1 month - 1 day'))::int)
  );
$$;

-- Creates the transactions that are due (up to today in São Paulo) for active rules.
-- Optional filters narrow it to one rule or one user. Returns how many were created.
create function private.generate_recurring(p_rule_id uuid default null, p_user_id uuid default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recurring_rules;
  v_today date := private.today_sp();
  v_from date;
  v_to date;
  v_month date;
  v_date date;
  v_created int := 0;
  v_rows int;
begin
  for r in
    select * from public.recurring_rules
    where active
      and (p_rule_id is null or id = p_rule_id)
      and (p_user_id is null or user_id = p_user_id)
    for update
  loop
    v_from := greatest(r.start_date, coalesce(r.generated_until + 1, r.start_date));
    v_to := least(v_today, coalesce(r.end_date, v_today));
    continue when v_to < v_from;

    for v_month in
      select generate_series(date_trunc('month', v_from), date_trunc('month', v_to), interval '1 month')::date
    loop
      v_date := private.occurrence_date(v_month, r.day_of_month);
      if v_date between v_from and v_to then
        insert into public.transactions
          (user_id, type, account_id, category_id, amount, date, description, recurring_rule_id)
        values
          (r.user_id, r.type, r.account_id, r.category_id, r.amount, v_date, r.description, r.id)
        on conflict (recurring_rule_id, date) where recurring_rule_id is not null do nothing;
        get diagnostics v_rows = row_count;
        v_created := v_created + v_rows;
      end if;
    end loop;

    update public.recurring_rules set generated_until = v_to where id = r.id;
  end loop;

  return v_created;
end;
$$;

-- Entry point for the app: only ever touches the caller's own rules.
create function public.generate_my_recurring(p_rule_id uuid default null)
returns int
language sql
security definer
set search_path = ''
as $$
  select private.generate_recurring(p_rule_id, auth.uid());
$$;

revoke all on function private.occurrence_date, private.generate_recurring from public;
revoke all on function public.generate_my_recurring from public, anon;
grant execute on function public.generate_my_recurring to authenticated;

-- Daily run at 06:00 UTC (03:00 in São Paulo).
create extension if not exists pg_cron;
select cron.schedule('finora-generate-recurring', '0 6 * * *', 'select private.generate_recurring()');
