-- Core schema: profiles, accounts, categories and transactions.
-- Every user-owned row carries user_id and is protected by Row Level Security.

-- Enums ----------------------------------------------------------------------

create type public.account_type as enum ('checking', 'savings', 'wallet', 'credit_card');
create type public.category_kind as enum ('income', 'expense');
create type public.transaction_type as enum ('income', 'expense', 'transfer');

-- Tables ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text check (char_length(name) <= 80),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  type public.account_type not null,
  initial_balance numeric(14, 2) not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  -- Lets child tables require that the account belongs to the same user.
  unique (id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind public.category_kind not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, name),
  unique (id, user_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type public.transaction_type not null,
  account_id uuid not null,
  -- Destination account, only for transfers.
  transfer_account_id uuid,
  category_id uuid,
  amount numeric(14, 2) not null check (amount > 0),
  date date not null,
  description text not null check (char_length(description) between 1 and 120),
  notes text check (char_length(notes) <= 500),
  -- Filled by statement imports (Phase 5) to detect duplicates.
  import_batch_id uuid,
  external_id text,
  created_at timestamptz not null default now(),

  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  foreign key (transfer_account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),

  constraint transfer_has_destination check ((type = 'transfer') = (transfer_account_id is not null)),
  constraint transfer_has_no_category check (type <> 'transfer' or category_id is null),
  constraint transfer_between_different_accounts check (transfer_account_id is distinct from account_id)
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_transfer_account_idx on public.transactions (transfer_account_id);
create index transactions_category_idx on public.transactions (category_id);
create unique index transactions_external_id_idx on public.transactions (user_id, account_id, external_id)
  where external_id is not null;

-- Row Level Security ---------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "Users read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Users update their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Users manage their own accounts" on public.accounts
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Users manage their own categories" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Users manage their own transactions" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Users may not flip their own demo flag.
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

-- New users ------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.create_default_data(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categories (user_id, name, kind)
  select p_user_id, name, 'expense'::public.category_kind
  from unnest(array[
    'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer',
    'Educação', 'Compras', 'Assinaturas', 'Outros'
  ]) as name
  union all
  select p_user_id, name, 'income'::public.category_kind
  from unnest(array['Salário', 'Freelance', 'Rendimentos', 'Outras receitas']) as name;

  insert into public.accounts (user_id, name, type)
  values (p_user_id, 'Conta principal', 'checking');
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'name'), ''));

  perform private.create_default_data(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
