-- Phase 11: savings goals ("caixinhas").
-- A goal has a target and an optional deadline. Contributions set money aside for it
-- (negative ones take it back); they do not move money between accounts, so balances and
-- reports are untouched. The optional account says where the money is kept.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  icon text not null default 'savings' check (icon in (
    'savings', 'flight', 'beach_access', 'home', 'directions_car', 'school',
    'laptop_mac', 'celebration', 'favorite', 'pets', 'flag'
  )),
  target_amount numeric(14, 2) not null check (target_amount > 0 and target_amount <= 999999999.99),
  -- The pace is measured from start_date to target_date.
  start_date date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  target_date date,
  account_id uuid,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete set null (account_id),
  constraint goal_deadline_after_start check (target_date is null or target_date >= start_date)
);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null,
  amount numeric(14, 2) not null check (amount <> 0 and abs(amount) <= 999999999.99),
  date date not null,
  note text check (char_length(note) <= 120),
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade
);

create index goals_user_idx on public.goals (user_id);
create index goal_contributions_goal_idx on public.goal_contributions (goal_id, date desc);

alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;

create policy "Users manage their own goals" on public.goals
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Users manage their own goal contributions" on public.goal_contributions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Goals with what has been set aside so far (RLS applies: security invoker).
create view public.goal_progress
with (security_invoker = true)
as
select
  g.id,
  g.user_id,
  g.name,
  g.icon,
  g.target_amount,
  g.start_date,
  g.target_date,
  g.account_id,
  g.created_at,
  coalesce(sum(c.amount), 0)::numeric(14, 2) as saved,
  count(c.id)::int as contribution_count,
  max(c.date) as last_contribution
from public.goals g
left join public.goal_contributions c on c.goal_id = g.id
group by g.id;

grant select on public.goal_progress to authenticated;
revoke all on public.goal_progress from anon;

-- Demo -------------------------------------------------------------------------

create function private.seed_demo_goals(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := private.today_sp();
  v_first date := (date_trunc('month', v_today) - interval '5 months')::date;
  v_savings uuid;
  v_trip uuid;
  v_reserve uuid;
  v_course uuid;
  i int;
begin
  delete from public.goals where user_id = p_user_id;
  select id into v_savings from public.accounts where user_id = p_user_id and name = 'Nubank' limit 1;

  insert into public.goals (user_id, name, icon, target_amount, start_date, target_date, account_id)
  values (p_user_id, 'Viagem para o Chile', 'flight', 9000, v_first,
    (date_trunc('month', v_today) + interval '8 months')::date + 14, v_savings)
  returning id into v_trip;

  insert into public.goals (user_id, name, icon, target_amount, start_date, target_date, account_id)
  values (p_user_id, 'Reserva de emergência', 'savings', 18000, v_first, null, v_savings)
  returning id into v_reserve;

  insert into public.goals (user_id, name, icon, target_amount, start_date, target_date)
  values (p_user_id, 'Curso de inglês', 'school', 2400, v_first, (v_first + interval '4 months')::date)
  returning id into v_course;

  for i in 0..5 loop
    insert into public.goal_contributions (user_id, goal_id, amount, date, note)
    values
      (p_user_id, v_trip, 550, (v_first + make_interval(months => i))::date + 5, 'Depois do salário'),
      (p_user_id, v_reserve, 1200, (v_first + make_interval(months => i))::date + 5, null);
  end loop;

  insert into public.goal_contributions (user_id, goal_id, amount, date, note)
  values
    (p_user_id, v_reserve, 4000, v_first + 2, 'Saldo que já estava guardado'),
    (p_user_id, v_reserve, -650, (v_first + interval '3 months')::date + 18, 'Conserto do carro'),
    (p_user_id, v_course, 1200, v_first + 10, null),
    (p_user_id, v_course, 1200, (v_first + interval '2 months')::date + 10, null);
end;
$$;

revoke all on function private.seed_demo_goals from public;

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
    perform private.seed_demo_goals(v_user);
    perform private.seed_demo_investments(v_user);
    perform private.seed_demo_fixed_income(v_user);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function private.reset_demo_accounts from public;
