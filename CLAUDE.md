# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **practice** library management system for a single library: students borrow/return books, staff manage the catalog, and a scheduled job emails students when they break a rule (overdue, over the borrowing limit). Three roles: student, librarian, manager.

- **`prd.md`** — what to build (data model §3, features §4, build order §6).
- **`plan.md`** — step-by-step implementation checklist.

It's a learning project — keep things simple and avoid over-engineering.

## Status

Planning stage — **no code yet**. Once scaffolded, update these commands:

```
npm run dev          # start dev server
npm run test         # vitest run (unit + integration)
npm run test:e2e     # playwright test (E2E)
npm run test:watch   # vitest --watch (during development)
```

## Testing rule

**Every feature must have a passing test before it is marked done.** Write the test alongside the feature — never after. A step in `plan.md` is only `[x]` when `vitest run` and the relevant Playwright tests pass.

- **Vitest** — unit tests for business logic (borrow eligibility, overdue checks, reminder dedup); integration tests for all API routes.
- **Playwright** — E2E tests for the golden path of each build-order milestone.

See `prd.md` §7 for the full testing matrix and `plan.md` for the per-step test checklist.

## Things that are easy to get wrong

- **Borrow and return touch two things** — the loan row *and* the book's `available_copies`. Wrap each in a transaction so they can't drift apart.
- **Enforce roles on the server**, not just by hiding UI. Check the current user's role on every staff/manager action.
- **Reminder emails must not double-send** — mark a reminder as sent (`loans.reminder_sent` / a `notifications` row) and check it before sending.
- **Dates in UTC**; compute "overdue" / "due soon" consistently.

## Stack (see `prd.md` §5)

Next.js (App Router) fullstack + Tailwind; PostgreSQL; email/password auth with hashed passwords; Resend for reminder emails (console-log in dev, send in prod); a daily cron (Vercel Cron → API route) for reminders.

@AGENTS.md
