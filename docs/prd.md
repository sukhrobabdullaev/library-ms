# PRD — Library Management System (practice project)

A simple app for **one library** where students borrow and return books, staff manage the catalog, and the system **automatically emails students when they break a rule** (e.g. overdue books). Built to practice full-stack development — not a commercial product.

| | |
|---|---|
| **Status** | Draft v1 |
| **Scope** | Single library, learning project |
| **Last updated** | 2026-06-01 |

---

## 1. Goal

Build a working app that covers the full borrow → return → notify loop, with three user roles and an automated email reminder system. Keep it small and finishable.

**In scope:** catalog, members, borrow/return, due dates, automated emails on rule violations, basic admin.
**Out of scope:** multiple libraries/branches, payments, ebooks, mobile apps, anything "enterprise."

---

## 2. Roles

| Capability | Student | Librarian | Manager |
|---|:---:|:---:|:---:|
| Search catalog, see own loans | ✅ | ✅ | ✅ |
| Borrow / return books | ✅ (self or at desk) | ✅ | ✅ |
| Add / edit / remove books | — | ✅ | ✅ |
| Register students | — | ✅ | ✅ |
| Configure rules (loan days, max books) | — | — | ✅ |
| View reports (overdue list, popular books) | — | partial | ✅ |

- **Student** — borrows and returns, gets reminder emails.
- **Librarian** — runs the desk: manages books and loans.
- **Manager** — sets the rules and sees reports.

---

## 3. Data model

Keep it minimal — six tables.

| Table | Fields |
|---|---|
| `users` | id, name, email, role (student/librarian/manager), password_hash |
| `books` | id, title, author, isbn, total_copies, available_copies |
| `loans` | id, book_id, user_id, borrowed_at, due_at, returned_at, reminder_sent |
| `rules` | id, loan_period_days, max_books_per_student, fine_per_day (optional) |
| `notifications` | id, user_id, loan_id, type, sent_at |

> Simplification: instead of tracking individual physical copies, a book just has `total_copies` and `available_copies`. Borrowing decrements, returning increments. Good enough for practice.

---

## 4. Core features

### Borrowing
- A student can borrow a book if `available_copies > 0` and they're under the `max_books_per_student` limit.
- On borrow: create a loan, set `due_at = now + loan_period_days`, decrement `available_copies`.

### Returning
- On return: set `returned_at`, increment `available_copies`.

### Automated rule-violation emails
This is the highlight. A scheduled job runs daily and sends emails:

| Trigger | Email |
|---|---|
| Book due in 2 days | Friendly reminder |
| Book overdue (1+ days) | "Please return your book" |
| Student over the book limit | "You've reached your borrowing limit" |

- Use `loans.reminder_sent` (or the `notifications` table) so the same reminder isn't sent twice.
- Email sending can start as console/log output, then swap in a real email service.

### Admin
- Librarian: CRUD books, register students, view/return loans at the desk.
- Manager: edit rules, see an overdue report and a most-borrowed list.

---

## 5. Tech stack

- **Framework:** Next.js (App Router) — fullstack, UI + API routes in one app
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL
- **Auth:** email + password with hashed passwords and a role check
- **Email:** [Resend](https://resend.com) for reminder emails (start by logging to console in dev, send via Resend in prod)
- **Scheduled job:** a daily cron for reminders (e.g. Vercel Cron hitting an API route, or node-cron)

---

## 6. Build order (suggested)

1. Auth + roles (login, three role types)
2. Books CRUD + catalog search
3. Borrow / return flow with due dates
4. Student "my loans" page
5. The scheduled reminder-email job ⭐
6. Manager rules config + simple reports

---

## 7. Testing strategy

Every feature added must have a corresponding test before marking it done. Tests live next to the code they cover.

**Tools**
- **Vitest** — unit and integration tests (API routes, server actions, business logic)
- **Playwright** — end-to-end tests for critical user flows in the browser

**Rules**
- Write the test *with* the feature, not after. A feature is only "done" when its test passes.
- Unit-test every piece of business logic in isolation: borrow eligibility, overdue calculation, reminder dedup.
- Integration-test every API route: hit the route directly, assert the DB state and the response.
- E2E-test each build-order milestone's golden path (see §6) once it is complete.
- Run `vitest run` and `playwright test` before declaring any step finished.

**What to test per feature**

| Feature | Test type | What to assert |
|---|---|---|
| Auth / login | Integration | Correct role in session; wrong password rejected; missing role blocked |
| Books CRUD | Integration | Create/edit/delete changes DB; `available_copies` = `total_copies` on create |
| Borrow | Integration + unit | Copies decremented; loan row created; blocked when 0 copies or limit reached |
| Return | Integration | `returned_at` set; copies incremented; both happen atomically |
| My loans page | E2E | Student sees their active and returned loans; overdue loans highlighted |
| Reminder job | Unit + integration | Due-soon email sent once; overdue email sent once; no duplicate on second run |
| Manager rules | Integration | Updated rule persists; new loans use new `loan_period_days` |
| Role guards | Integration | Student can't hit librarian/manager routes; librarian can't hit manager-only routes |

---

## 8. Nice-to-haves (only if time allows)

- Fines for overdue books
- Book reservations/waitlist
- Email templates the manager can edit
- A dashboard with charts
