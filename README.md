<p align="center">
  <img src="public/brand/finora-mark.svg" width="72" height="72" alt="Finora logo" />
</p>

<h1 align="center">Finora</h1>

<p align="center">Personal finance, with clarity. A portfolio project.</p>

---

Finora is a web app for personal finance management: see where money comes in and,
above all, where it goes out, plus an investments view with live quotes.

The interface is in Brazilian Portuguese; code and docs are in English.

## Status

| Phase | Scope | Status |
| --- | --- | --- |
| 0. Setup | Next.js, design tokens, app shell, light/dark theme | Done |
| 1. Auth | Supabase Auth (email), demo account, core schema with RLS | Done |
| 2. Transactions | Accounts, categories, CRUD, filters | Done |
| 3. Dashboard | Monthly summary, charts, top expenses | Done |
| 4. Budgets + recurring | Category limits, monthly recurring entries | Done |
| 5. Import | OFX/CSV statement import with auto-categorization | Done |
| 6. Investments | Stocks, FIIs, ETFs, crypto, US stocks with live quotes | Done |
| 7. Fixed income | CDB / Tesouro valuation from CDI and IPCA series | Done |
| 8. Net worth + polish | Net worth over time, empty states, README media | Next |

The full plan is in [docs/mvp-plan.md](docs/mvp-plan.md) (Portuguese).

## Tech stack

- **Next.js 16** (App Router, Cache Components) + **TypeScript**
- **Tailwind CSS 4** with design tokens from the Finora design system
- **Supabase** (Postgres, Auth, Row Level Security)
- **Vercel** for hosting
- Quotes: [brapi.dev](https://brapi.dev), CoinGecko, Banco Central (SGS), Tesouro Transparente

## Design

The visual identity ("Alvorada") pairs blu notte and ivory with a single touch of antique gold.
Headings use **Bodoni Moda** (optical size 14), UI text uses **Instrument Sans**, and icons are
**Material Symbols Rounded**. Every token lives in [`src/app/globals.css`](src/app/globals.css) and
switches between light and dark themes through `data-theme` on `<html>`, set before first paint
so there is no theme flash.

### Recurring transactions

Rules live in `recurring_rules`. A `pg_cron` job runs `private.generate_recurring()` every day
at 03:00 (São Paulo) and creates what is due, clamping day 31 to short months. Each rule keeps
`generated_until`, so generation only moves forward: deleting a generated transaction does not
bring it back, and a unique index on `(recurring_rule_id, date)` makes reruns idempotent.
Creating or editing a rule also generates anything already due right away.

### Statement import

`/transactions/import` reads OFX (1.x SGML and 2.x XML, Latin-1 or UTF-8) and bank CSVs
(Nubank account and card exports, `;` or `,`, debit/credit columns, a title row above the
header). Nothing is saved until the review step, where each row shows:

- **a suggested category**: first from how you categorized the same merchant before
  (`category_history()`), then from built-in merchant keywords (iFood, Uber, Drogasil…);
- **duplicate flags**: the bank's own id (`FITID`) already imported, or a movement with the same
  day, direction and amount already in the account.

Every import gets an `import_batch_id`, so it can be undone in one click. Sample files at
`/samples/extrato-exemplo.ofx` and `/samples/fatura-exemplo.csv` are generated with recent dates.

### Investments and quotes

Trades (`asset_trades`) are the source of truth; positions are computed with the average-cost
method the Receita Federal uses (`src/lib/investments/position.ts`): buys raise the average
price (fees included), sales keep it and realize the difference. A sale can never exceed what was
held on its date, including after edits or deletions.

Prices come from three providers, called only on the server:

| Asset | Provider | Notes |
| --- | --- | --- |
| B3 stocks, FIIs, ETFs, US stocks | brapi.dev | Free plan: one symbol per request and one request at a time, so symbols are fetched sequentially with a retry on HTTP 429 |
| Crypto | CoinGecko | Batch request, prices in BRL; tickers resolved via search by market cap |
| USD/BRL | AwesomeAPI | Converts US positions for portfolio totals |

Quotes are cached for 15 minutes in a shared `quotes` table that signed-in users can read and only
the server writes (secret key). When a provider fails, the last cached price is shown and the page
says so.

### Fixed income

CDB, LCI/LCA and Tesouro are valued from Banco Central SGS series (CDI = 12, Selic = 11,
IPCA = 433), cached in `index_rates` and refreshed every few hours (`src/lib/fixed-income/`):

- **% do CDI / % da Selic**: the principal compounds `1 + daily rate × percentage` on each business
  day from the start date up to the valuation date (or maturity).
- **Prefixado**: `(1 + annual rate) ^ (business days / 252)`.
- **IPCA +**: published monthly IPCA (first month pro rata) × `(1 + spread) ^ (business days / 252)`.
  Unpublished months are not counted, so it trails reality by about a month of inflation.
- Business days come from the CDI series itself (one entry per business day).
- Income tax uses the regressive table (22.5% → 15%) unless the asset is exempt (LCI/LCA).

Values are estimates: banks round differently, IOF applies in the first 30 days, and Tesouro
titles are marked to market. The UI says so, and flags an index that could not be downloaded
instead of showing a zero gain.

### Charts

The "Receitas x Despesas" chart is hand-built (no chart library): grouped columns with a
hairline grid, a hover/tap readout, a legend and a table view. Income uses `brand` and
expenses `ink`, the brand book's money colors; the pair was checked for color-vision
deficiency separation and 3:1 contrast in both themes. Spending by category uses
single-hue bars instead of a donut so categories compare on a shared baseline.

## Getting started

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest): money parsing, dates, summaries |
| `npm run db:push` | Apply pending migrations in `supabase/migrations` |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` |
| `npm run seed:demo` | Create or reset the demo account with six months of data |

## Security model

- Every table has **Row Level Security**: a user can only read and write rows whose `user_id`
  is their own (`auth.uid()`).
- Dashboard totals are computed in Postgres (`monthly_totals`, `expense_category_totals`),
  `security invoker` functions that respect RLS and avoid the API's 1,000-row page limit.
- Balances come from the `account_balances` view, declared with `security_invoker` so RLS
  still applies to the caller.
- Composite foreign keys (`(account_id, user_id)`) make it impossible to attach a transaction to
  another user's account or category, even with a guessed id.
- The session is refreshed in `src/proxy.ts`, which also redirects signed-out visitors to
  `/login`. That redirect is only a convenience; authorization lives in RLS and in
  `getCurrentUser()` (`src/lib/auth.ts`).
- Privileged code (demo seed, new-user trigger) lives in a `private` Postgres schema that the
  public API cannot reach. Users cannot change their own `is_demo` flag.
- The demo account is a regular user created by `npm run seed:demo`; its credentials stay on the
  server and the "Entrar como demo" button signs in through a Server Action.

## Project structure

```
src/
  app/
    (app)/            # Authenticated area: dashboard, transactions, accounts, ...
    (auth)/           # Login, sign-up and their Server Actions
    auth/callback/    # Email confirmation link handler
    layout.tsx        # Fonts, theme script, metadata
    globals.css       # Design tokens (colors, type scale, radii, shadows)
  components/
    brand/            # Logo
    finance/          # Balance card, transaction list, spending breakdown
    layout/           # App shell, navigation, theme toggle
    ui/               # Button, card, icon, empty state
  lib/
    data/             # Server-only queries (accounts, categories, transactions)
    supabase/         # Server client, proxy session refresh, generated DB types
    auth.ts           # getCurrentUser(): the data access layer entry point
  proxy.ts            # Session refresh + optimistic auth redirects
supabase/migrations/  # SQL schema, RLS policies, demo seed function
scripts/              # db:push, db:types, seed:demo
```
