-- Phase 7: fixed income (CDB, LCI/LCA, Tesouro) valued from Banco Central index series.

create type public.fixed_income_kind as enum
  ('cdb', 'lci_lca', 'tesouro_selic', 'tesouro_prefixado', 'tesouro_ipca', 'debenture', 'other');

-- cdi / selic: `rate` is a percentage of the index (110 = 110% do CDI).
-- pre: `rate` is the annual rate (12.5 = 12,5% a.a.).
-- ipca: `rate` is the annual spread over IPCA (6.2 = IPCA + 6,2% a.a.).
create type public.fixed_income_index as enum ('cdi', 'selic', 'pre', 'ipca');

create table public.fixed_income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind public.fixed_income_kind not null,
  index public.fixed_income_index not null,
  rate numeric(8, 4) not null check (rate > 0 and rate <= 1000),
  principal numeric(14, 2) not null check (principal > 0),
  start_date date not null,
  maturity_date date check (maturity_date is null or maturity_date > start_date),
  -- LCI, LCA and some debentures are exempt from income tax for individuals.
  tax_exempt boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.fixed_income enable row level security;
create policy "Users manage their own fixed income" on public.fixed_income
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Index series from the Banco Central SGS API, shared by everyone (public data).
-- cdi = series 12 and selic = series 11 (% per business day); ipca = series 433 (% per month).
create table public.index_rates (
  series text not null check (series in ('cdi', 'selic', 'ipca')),
  date date not null,
  value numeric(12, 8) not null,
  primary key (series, date)
);

create table public.index_sync (
  series text primary key check (series in ('cdi', 'selic', 'ipca')),
  -- Earliest date already loaded and when the series was last refreshed.
  synced_from date not null,
  synced_at timestamptz not null default now()
);

alter table public.index_rates enable row level security;
alter table public.index_sync enable row level security;
create policy "Signed-in users read index rates" on public.index_rates for select to authenticated using (true);
create policy "Signed-in users read index sync" on public.index_sync for select to authenticated using (true);
revoke insert, update, delete on public.index_rates, public.index_sync from anon, authenticated;
