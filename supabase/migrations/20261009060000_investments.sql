-- Phase 6: investments (stocks, FIIs, ETFs, US stocks, crypto), trades and a quote cache.

create type public.asset_class as enum ('stock_br', 'fii', 'etf', 'stock_us', 'crypto');
create type public.trade_type as enum ('buy', 'sell');

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class public.asset_class not null,
  ticker text not null check (ticker ~ '^[A-Z0-9.\-]{1,20}$'),
  name text not null check (char_length(name) between 1 and 120),
  currency text not null check (currency in ('BRL', 'USD')),
  -- Where the price comes from and the id it uses there (brapi symbol, CoinGecko coin id).
  quote_source text not null check (quote_source in ('brapi', 'coingecko')),
  quote_id text not null check (char_length(quote_id) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (user_id, class, ticker),
  unique (id, user_id)
);

create table public.asset_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  asset_id uuid not null,
  type public.trade_type not null,
  quantity numeric(24, 8) not null check (quantity > 0),
  -- Unit price and fees in the asset's currency.
  price numeric(24, 8) not null check (price > 0),
  fees numeric(14, 2) not null default 0 check (fees >= 0),
  date date not null,
  created_at timestamptz not null default now(),
  foreign key (asset_id, user_id) references public.assets (id, user_id) on delete cascade
);

create index asset_trades_asset_date_idx on public.asset_trades (asset_id, date);

alter table public.assets enable row level security;
alter table public.asset_trades enable row level security;

create policy "Users manage their own assets" on public.assets
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Users manage their own trades" on public.asset_trades
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Quote cache shared by everyone: market prices are public data. Signed-in users read it;
-- only the server (secret key, bypasses RLS) writes it.
create table public.quotes (
  source text not null check (source in ('brapi', 'coingecko', 'fx')),
  quote_id text not null,
  price numeric(24, 8) not null,
  currency text not null,
  change_percent numeric(10, 4),
  name text,
  logo_url text,
  market_time timestamptz,
  fetched_at timestamptz not null default now(),
  primary key (source, quote_id)
);

alter table public.quotes enable row level security;
create policy "Signed-in users read quotes" on public.quotes for select to authenticated using (true);
revoke insert, update, delete on public.quotes from anon, authenticated;
