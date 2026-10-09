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
