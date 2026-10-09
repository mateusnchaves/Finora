-- Demo seed: adds recurring rules for fixed bills and monthly budgets.

create or replace function private.seed_demo_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_itau uuid;
  v_nubank uuid;
  v_wallet uuid;
  v_card uuid;
  v_month date;
  v_card_total numeric;
  v_first_month date := (date_trunc('month', private.today_sp()) - interval '5 months')::date;
  i int;
  j int;
begin
  perform setseed(0.42);

  delete from public.transactions where user_id = p_user_id;
  delete from public.accounts where user_id = p_user_id;
  delete from public.categories where user_id = p_user_id;
  perform private.create_default_data(p_user_id);
  delete from public.accounts where user_id = p_user_id;

  update public.profiles set name = 'Visitante', is_demo = true where id = p_user_id;

  insert into public.accounts (user_id, name, type, initial_balance)
  values (p_user_id, 'Itaú', 'checking', 2350) returning id into v_itau;
  insert into public.accounts (user_id, name, type, initial_balance)
  values (p_user_id, 'Nubank', 'checking', 1840) returning id into v_nubank;
  insert into public.accounts (user_id, name, type, initial_balance)
  values (p_user_id, 'Carteira', 'wallet', 120) returning id into v_wallet;
  insert into public.accounts (user_id, name, type, initial_balance)
  values (p_user_id, 'Cartão Nubank', 'credit_card', 0) returning id into v_card;

  for i in 0..5 loop
    v_month := (v_first_month + make_interval(months => i))::date;

    -- Income
    perform private.demo_tx(p_user_id, v_itau, 'income', 'Salário', 'Salário', 5200, v_month + 4);
    perform private.demo_tx(p_user_id, v_nubank, 'income', 'Rendimentos', 'Rendimento da conta',
      private.demo_amount(18, 42), v_month);
    if i % 2 = 0 then
      perform private.demo_tx(p_user_id, v_nubank, 'income', 'Freelance', 'Freela de design',
        private.demo_amount(600, 1400), v_month + 17);
    end if;

    -- Cash for the wallet, so small cash purchases have money to come from.
    if v_month + 1 <= private.today_sp() then
      insert into public.transactions (user_id, type, account_id, transfer_account_id, amount, date, description)
      values (p_user_id, 'transfer', v_itau, v_wallet, 100, v_month + 1, 'Saque para a carteira');
    end if;

    -- Fixed expenses
    perform private.demo_tx(p_user_id, v_itau, 'expense', 'Moradia', 'Aluguel', 1450, v_month + 4);
    perform private.demo_tx(p_user_id, v_itau, 'expense', 'Moradia', 'Condomínio', 420, v_month + 9);
    perform private.demo_tx(p_user_id, v_itau, 'expense', 'Moradia', 'Conta de luz',
      private.demo_amount(115, 210), v_month + 14);
    perform private.demo_tx(p_user_id, v_itau, 'expense', 'Moradia', 'Internet fibra', 99.90, v_month + 11);
    perform private.demo_tx(p_user_id, v_card, 'expense', 'Assinaturas', 'Streaming de vídeo', 39.90, v_month + 1);
    perform private.demo_tx(p_user_id, v_card, 'expense', 'Assinaturas', 'Spotify', 21.90, v_month + 7);
    perform private.demo_tx(p_user_id, v_nubank, 'expense', 'Saúde', 'Academia', 99.90, v_month + 6);
    perform private.demo_tx(p_user_id, v_card, 'expense', 'Educação', 'Curso online', 49.90, v_month + 19);

    -- Variable expenses
    for j in 0..3 loop
      perform private.demo_tx(p_user_id, v_card, 'expense', 'Alimentação', 'Supermercado',
        private.demo_amount(160, 380), v_month + 2 + j * 7);
      perform private.demo_tx(p_user_id, v_card, 'expense', 'Transporte', 'Uber',
        private.demo_amount(14, 46), v_month + 4 + j * 7);
    end loop;
    for j in 0..(2 + (random() * 3)::int) loop
      perform private.demo_tx(p_user_id, v_card, 'expense', 'Alimentação', 'iFood',
        private.demo_amount(35, 95), v_month + (random() * 27)::int);
    end loop;
    for j in 0..2 loop
      perform private.demo_tx(p_user_id, v_wallet, 'expense', 'Alimentação', 'Padaria',
        private.demo_amount(12, 32), v_month + 3 + j * 9);
    end loop;
    perform private.demo_tx(p_user_id, v_nubank, 'expense', 'Transporte', 'Combustível',
      private.demo_amount(180, 260), v_month + 8);
    perform private.demo_tx(p_user_id, v_nubank, 'expense', 'Transporte', 'Combustível',
      private.demo_amount(180, 260), v_month + 22);
    perform private.demo_tx(p_user_id, v_card, 'expense', 'Saúde', 'Farmácia',
      private.demo_amount(35, 140), v_month + 12);
    perform private.demo_tx(p_user_id, v_card, 'expense', 'Lazer', 'Cinema',
      private.demo_amount(60, 110), v_month + 13);
    perform private.demo_tx(p_user_id, v_card, 'expense', 'Lazer', 'Bar com amigos',
      private.demo_amount(90, 190), v_month + 20);
    perform private.demo_tx(p_user_id, v_card, 'expense', 'Compras', 'Loja de roupas',
      private.demo_amount(90, 380), v_month + 16);

    -- Pay this month's card bill from Itaú on the 10th of the next month.
    select coalesce(sum(amount), 0) into v_card_total
    from public.transactions
    where user_id = p_user_id and account_id = v_card
      and date >= v_month and date < (v_month + interval '1 month')::date;

    if v_card_total > 0 and (v_month + interval '1 month 9 days')::date <= private.today_sp() then
      insert into public.transactions (user_id, type, account_id, transfer_account_id, amount, date, description)
      values (p_user_id, 'transfer', v_itau, v_card, v_card_total,
        (v_month + interval '1 month 9 days')::date, 'Pagamento da fatura');
    end if;
  end loop;

  -- Recurring rules for the fixed bills and the salary. Already-seeded months count as
  -- generated, and the matching transactions are linked to their rule.
  insert into public.recurring_rules
    (user_id, type, account_id, category_id, amount, description, day_of_month, start_date, generated_until)
  select p_user_id, r.type::public.transaction_type, r.account_id, c.id, r.amount, r.description, r.day,
    v_first_month, private.today_sp()
  from (values
    ('income', v_itau, 'income', 'Salário', 5200.00, 'Salário', 5),
    ('expense', v_itau, 'expense', 'Moradia', 1450.00, 'Aluguel', 5),
    ('expense', v_itau, 'expense', 'Moradia', 420.00, 'Condomínio', 10),
    ('expense', v_itau, 'expense', 'Moradia', 99.90, 'Internet fibra', 12),
    ('expense', v_card, 'expense', 'Assinaturas', 39.90, 'Streaming de vídeo', 2),
    ('expense', v_card, 'expense', 'Assinaturas', 21.90, 'Spotify', 8),
    ('expense', v_nubank, 'expense', 'Saúde', 99.90, 'Academia', 7)
  ) as r(type, account_id, kind, category, amount, description, day)
  join public.categories c
    on c.user_id = p_user_id and c.kind = r.kind::public.category_kind and c.name = r.category;

  update public.transactions t
  set recurring_rule_id = rr.id
  from public.recurring_rules rr
  where t.user_id = p_user_id and rr.user_id = p_user_id
    and t.description = rr.description and t.account_id = rr.account_id;

  -- Monthly budgets.
  insert into public.budgets (user_id, category_id, amount)
  select p_user_id, c.id, b.amount
  from (values
    ('Alimentação', 1700.00), ('Moradia', 2200.00), ('Transporte', 650.00),
    ('Lazer', 300.00), ('Compras', 250.00), ('Assinaturas', 70.00), ('Saúde', 250.00)
  ) as b(category, amount)
  join public.categories c on c.user_id = p_user_id and c.kind = 'expense' and c.name = b.category;
end;
$$;

revoke all on function private.seed_demo_data from public;
