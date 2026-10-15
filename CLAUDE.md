@AGENTS.md

# Finora

Personal finance web app, portfolio project. Plan and phases: `docs/mvp-plan.md`.

## Conventions
- UI text in Brazilian Portuguese; code, comments, commits and README in English.
- Routes use English paths (`/transactions`, `/budgets`).
- Design tokens live in `src/app/globals.css` and mirror the Finora design system
  (https://claude.ai/artifact/8VXefhYf4uCNHDWXiNPuGk). Use token classes (`bg-surface`,
  `text-ink`, `text-brand`, `text-heading-md`), never raw hex values.
- Brand rules: income in `brand` with "+", expenses in `ink` with "−" (U+2212), never red for a
  regular expense; `negative` only for real alerts; `accent` (gold) at most once per screen and
  never as text. Status always pairs color with a word or icon.
- Money and dates go through `src/lib/format.ts` ("R$ 1.836,20", "6 out").
- New icons must be added to `ICON_NAMES` in `src/components/ui/icon.tsx`.
- API tokens (brapi, etc.) stay server-side; never prefix them with `NEXT_PUBLIC_`.
- Database changes go in a new file in `supabase/migrations/` (never edit an applied one), then
  `npm run db:push` and `npm run db:types`. Every user-owned table needs `user_id`, RLS and
  composite foreign keys to the parent's `(id, user_id)`.
- Server code reads the user through `getCurrentUser()` in `src/lib/auth.ts`, inside a
  `<Suspense>` boundary (Cache Components is on).
- Forms: Server Actions validate with Zod and return `FormState` (`src/lib/forms.ts`); the client
  form keys itself on `state.attempt` to refill values after an error. Money input goes through
  `parseMoney`. Run `npm test` after touching `src/lib`.
- Anything that reads "today" (`todayISO()`) must run after `await connection()` or request data,
  or Cache Components fails the build.
- Quotes: never call brapi in parallel (free plan returns 429); go through `getQuotes()` in
  `src/lib/investments/quotes.ts`, which caches and serializes. The admin client
  (`src/lib/supabase/admin.ts`) is only for the shared quote cache, never for user rows; the one
  exception is the daily notification job (`src/app/api/cron/notify`), which has no signed-in user.
- Paid services need the owner's OK first: prefer free tiers (the assistant runs on Gemini's free tier).
