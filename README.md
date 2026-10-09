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
| 1. Auth | Supabase Auth (email + Google), demo account | Next |
| 2. Transactions | Accounts, categories, CRUD, filters | Planned |
| 3. Dashboard | Monthly summary, charts, top expenses | Planned |
| 4. Budgets + recurring | Category limits, monthly recurring entries | Planned |
| 5. Import | OFX/CSV statement import with auto-categorization | Planned |
| 6. Investments | Stocks, FIIs, ETFs, crypto, US stocks with live quotes | Planned |
| 7. Fixed income | CDB / Tesouro valuation from CDI and IPCA series | Planned |
| 8. Net worth + polish | Net worth over time, empty states, README media | Planned |

The full plan is in [docs/mvp-plan.md](docs/mvp-plan.md) (Portuguese).

## Tech stack

- **Next.js 16** (App Router, Cache Components) + **TypeScript**
- **Tailwind CSS 4** with design tokens from the Finora design system
- **Supabase** (Postgres, Auth, Row Level Security) — from Phase 1
- **Vercel** for hosting
- Quotes: [brapi.dev](https://brapi.dev), CoinGecko, Banco Central (SGS), Tesouro Transparente

## Design

The visual identity ("Alvorada") pairs blu notte and ivory with a single touch of antique gold.
Headings use **Bodoni Moda** (optical size 14), UI text uses **Instrument Sans**, and icons are
**Material Symbols Rounded**. Every token lives in [`src/app/globals.css`](src/app/globals.css) and
switches between light and dark themes through `data-theme` on `<html>`, set before first paint
so there is no theme flash.

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

## Project structure

```
src/
  app/
    (app)/            # Authenticated area: dashboard, transactions, accounts, ...
    layout.tsx        # Fonts, theme script, metadata
    globals.css       # Design tokens (colors, type scale, radii, shadows)
  components/
    brand/            # Logo
    finance/          # Balance card, transaction list, spending breakdown
    layout/           # App shell, navigation, theme toggle
    ui/               # Button, card, icon, empty state
  lib/                # Formatting (BRL, dates), summaries, sample data
```
