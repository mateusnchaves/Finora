-- Demo portfolio: stocks, FIIs, an ETF, a US stock and crypto, with a few sales.
-- Trade dates are relative to today (São Paulo). Called by `npm run seed:demo`.

create function private.seed_demo_investments(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := private.today_sp();
  v_asset uuid;
  r record;
begin
  delete from public.assets where user_id = p_user_id;

  for r in
    select * from (values
      ('stock_br', 'PETR4', 'Petrobras PN', 'BRL', 'brapi', 'PETR4'),
      ('stock_br', 'ITUB4', 'Itaú Unibanco PN', 'BRL', 'brapi', 'ITUB4'),
      ('stock_br', 'VALE3', 'Vale ON', 'BRL', 'brapi', 'VALE3'),
      ('fii', 'MXRF11', 'Maxi Renda FII', 'BRL', 'brapi', 'MXRF11'),
      ('fii', 'HGLG11', 'Pátria Log FII', 'BRL', 'brapi', 'HGLG11'),
      ('etf', 'BOVA11', 'iShares Ibovespa', 'BRL', 'brapi', 'BOVA11'),
      ('stock_us', 'AAPL', 'Apple Inc.', 'USD', 'brapi', 'AAPL'),
      ('crypto', 'BTC', 'Bitcoin', 'BRL', 'coingecko', 'bitcoin'),
      ('crypto', 'ETH', 'Ethereum', 'BRL', 'coingecko', 'ethereum')
    ) as a(class, ticker, name, currency, source, quote_id)
  loop
    insert into public.assets (user_id, class, ticker, name, currency, quote_source, quote_id)
    values (p_user_id, r.class::public.asset_class, r.ticker, r.name, r.currency, r.source, r.quote_id)
    returning id into v_asset;

    insert into public.asset_trades (user_id, asset_id, type, quantity, price, fees, date)
    select p_user_id, v_asset, t.type::public.trade_type, t.quantity, t.price, t.fees,
      (v_today - make_interval(days => t.days_ago))::date
    from (values
      ('PETR4', 'buy', 100, 51.20, 4.90, 150),
      ('PETR4', 'buy', 50, 53.90, 4.90, 60),
      ('ITUB4', 'buy', 200, 46.10, 4.90, 120),
      ('VALE3', 'buy', 60, 63.80, 4.90, 140),
      ('VALE3', 'sell', 20, 69.10, 4.90, 25),
      ('MXRF11', 'buy', 400, 9.62, 0, 150),
      ('MXRF11', 'buy', 200, 9.41, 0, 55),
      ('HGLG11', 'buy', 15, 158.40, 0, 90),
      ('BOVA11', 'buy', 40, 192.50, 0, 110),
      ('AAPL', 'buy', 6, 318.00, 1.50, 115),
      ('BTC', 'buy', 0.012, 395000, 0, 150),
      ('BTC', 'sell', 0.002, 430000, 0, 30),
      ('ETH', 'buy', 0.4, 13200, 0, 80)
    ) as t(ticker, type, quantity, price, fees, days_ago)
    where t.ticker = r.ticker;
  end loop;
end;
$$;

revoke all on function private.seed_demo_investments from public;
