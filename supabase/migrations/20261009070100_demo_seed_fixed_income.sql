-- Demo fixed income: one of each common kind, started at different times.

create function private.seed_demo_fixed_income(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := private.today_sp();
begin
  delete from public.fixed_income where user_id = p_user_id;

  insert into public.fixed_income
    (user_id, name, kind, index, rate, principal, start_date, maturity_date, tax_exempt)
  values
    (p_user_id, 'CDB Banco Inter 2027', 'cdb', 'cdi', 110, 8000,
      (v_today - interval '14 months')::date, (v_today + interval '13 months')::date, false),
    (p_user_id, 'LCI Banco do Brasil', 'lci_lca', 'cdi', 94, 5000,
      (v_today - interval '8 months')::date, (v_today + interval '16 months')::date, true),
    (p_user_id, 'Tesouro Selic 2029', 'tesouro_selic', 'selic', 100, 6000,
      (v_today - interval '18 months')::date, make_date(2029, 3, 1), false),
    (p_user_id, 'Tesouro Prefixado 2028', 'tesouro_prefixado', 'pre', 13.1, 3000,
      (v_today - interval '5 months')::date, make_date(2028, 1, 1), false),
    (p_user_id, 'Tesouro IPCA+ 2035', 'tesouro_ipca', 'ipca', 6.2, 4000,
      (v_today - interval '10 months')::date, make_date(2035, 5, 15), false);
end;
$$;

revoke all on function private.seed_demo_fixed_income from public;
