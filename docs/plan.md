# Implementation Plan — Library Management System

Technical build plan for the practice project. See `prd.md` for the *what/why*; this is the *how*. Stack: Next.js (App Router) fullstack + Tailwind, PostgreSQL, Resend for emails.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done.

A step is only **done** when its tests pass. Run `vitest run` (unit/integration) and `playwright test` (E2E) to verify each step.

---

## Step 0 — Setup

- [x] `git init`; `.gitignore`, `.env.example`
- [x] Scaffold the Next.js app (App Router) + Tailwind
- [x] Set up PostgreSQL + a migration/schema file (Prisma chosen as ORM)
- [x] Create the tables from `prd.md` §3: `users`, `books`, `loans`, `rules`, `notifications`
- [x] Seed script: one manager, one librarian, a couple students, ~10 books, default rules
- [x] Install **Vitest** + `@vitest/coverage-v8` + testing utilities (`vitest`, `@testing-library/react`, `msw` for API mocking)
- [x] Install **Playwright** (`npx playwright install`)
- [x] Add `"test": "vitest run"` and `"test:e2e": "playwright test"` scripts to `package.json`
- [x] Confirm `vitest run` and `playwright test` both execute (even with zero tests)

> DB runs via Docker: `docker compose up -d` → starts PostgreSQL on port 5438 (`postgres/postgres`). Migration and seed already applied.

---

## Step 1 — Auth + roles

- [x] Email + password signup/login; hash passwords (bcrypt)
- [x] Store `role` on the user (student / librarian / manager)
- [x] Session via JWT (`jose`); `getCurrentUser()` helper
- [x] Route/page guards: middleware + layout-level redirects by role
- **Tests**
  - [x] Unit: `getCurrentUser()` returns null for unauthenticated requests
  - [x] Integration: `POST /api/auth/login` — correct credentials return a session; wrong password returns 401
  - [x] Integration: librarian route returns 403 when called with a student session
  - [x] Integration: manager route returns 403 when called with a librarian session
  - [x] E2E: student logs in and lands on student dashboard; staff login redirects to staff area

---

## Step 2 — Books CRUD + catalog

- [x] Librarian UI: add / edit / remove books (title, author, isbn, total_copies)
- [x] `available_copies` defaults to `total_copies` on create
- [x] Catalog list + search by title/author/isbn (visible to everyone logged in)
- [x] Book detail page showing availability
- **Tests**
  - [x] Integration: `POST /api/books` creates a book with `available_copies = total_copies`
  - [x] Integration: `PATCH /api/books/:id` updates the record; student session returns 403
  - [x] Integration: `DELETE /api/books/:id` removes the book; student session returns 403
  - [x] Integration: `GET /api/books?q=...` returns books matching title/author/isbn
  - [x] E2E: librarian adds a book, it appears in the catalog search

---

## Step 3 — Borrow / return

- [x] Borrow: check `available_copies > 0` and student under `max_books_per_student`
- [x] On borrow: create loan, set `due_at = now + loan_period_days`, decrement `available_copies` (do both in one transaction)
- [x] Return: set `returned_at`, increment `available_copies`
- [x] Librarian desk view: borrow/return on behalf of a student
- [x] Block borrowing with a clear message when a rule is violated
- **Tests**
  - [x] Unit: `canBorrow(student, book, rules)` returns false when `available_copies = 0`
  - [x] Unit: `canBorrow` returns false when student is at `max_books_per_student`
  - [x] Integration: `POST /api/loans` decrements `available_copies` and creates a loan row (verify both atomically)
  - [x] Integration: borrowing when `available_copies = 0` returns a 409 with a clear error message
  - [x] Integration: borrowing at the max-book limit returns a 409 with a clear error message
  - [x] Integration: `POST /api/loans/:id/return` sets `returned_at` and increments `available_copies`
  - [x] E2E: student borrows a book; available count drops; student returns it; count recovers

---

## Step 4 — Student "My loans"

- [x] Page listing the student's active loans with due dates
- [x] Highlight overdue loans
- [x] Show borrowing history (returned loans)
- **Tests**
  - [x] Unit: `isOverdue(loan)` returns true when `due_at < now` and `returned_at` is null
  - [x] Integration: `GET /api/loans/mine` returns only the current student's loans
  - [x] E2E: overdue loan appears highlighted on the My Loans page; returned loans appear in history

---

## Step 5 — Automated reminder emails ⭐

- [x] Email module wrapping Resend; log to console in dev, send via Resend in prod (verify a sending domain/API key)
- [x] Daily scheduled job (Vercel Cron hitting a protected API route, or node-cron)
- [x] Job logic, with dedup so the same reminder isn't sent twice:
  - [x] Due in 2 days → friendly reminder
  - [x] Overdue (1+ days) → "please return"
  - [x] Over the book limit → "limit reached"
- [x] Mark sent via `loans.reminder_sent` and/or a `notifications` row
- **Tests**
  - [x] Unit: reminder-selection logic picks the correct email type for each scenario (due-soon / overdue / over-limit)
  - [x] Unit: a loan with `reminder_sent = true` is excluded from the send list
  - [x] Integration: `POST /api/cron/reminders` sends an email for an overdue loan and writes a `notifications` row
  - [x] Integration: calling the cron route a second time does **not** create a duplicate `notifications` row (dedup check)
  - [x] Integration: cron route returns 401 when called without the cron secret header

---

## Step 6 — Manager: rules + reports

- [ ] Edit rules: `loan_period_days`, `max_books_per_student`, optional `fine_per_day`
- [ ] Overdue report (who has what, how many days late)
- [ ] Most-borrowed books list
- **Tests**
  - [ ] Integration: `PATCH /api/rules` updates the rules row; student/librarian sessions return 403
  - [ ] Integration: a new loan after a rules update uses the new `loan_period_days` for `due_at`
  - [ ] Integration: `GET /api/reports/overdue` returns all loans past their due date
  - [ ] Integration: `GET /api/reports/popular` returns books ordered by borrow count
  - [ ] E2E: manager changes `loan_period_days`; a new borrow reflects the new due date

---

## Nice-to-haves (only if time allows)

- [ ] Fines calculated from overdue days
- [ ] Reservations / waitlist when a book is unavailable
- [ ] Manager-editable email templates
- [ ] Dashboard with simple charts

---

## Keep in mind throughout

- Borrow and return touch two things (the loan + `available_copies`) — wrap each in a transaction so they can't drift apart.
- Check the role on every staff/manager action on the server, not just by hiding UI.
- Store dates in UTC; compute "overdue"/"due soon" consistently.
- A step is **not done** until `vitest run` and the relevant Playwright tests pass.
