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
| 4. Budgets + recurring | Category limits, monthly recurring entries | Next |
| 5. Import | OFX/CSV statement import with auto-categorization | Planned |
| 6. Investments | Stocks, FIIs, ETFs, crypto, US stocks with live quotes | Planned |
| 7. Fixed income | CDB / Tesouro valuation from CDI and IPCA series | Planned |
| 8. Net worth + polish | Net worth over time, empty states, README media | Planned |

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
