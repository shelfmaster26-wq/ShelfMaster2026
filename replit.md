# ShelfMaster

A web-based library management system (LMS) built with React + Vite, an Express.js API, and a Supabase (PostgreSQL) database.

## Tech Stack

- **Frontend:** React 19, React Router DOM v7
- **Build Tool:** Vite 8 served through an Express server on port 5000
- **Backend:** Express.js API (`server.js`)
- **Database:** Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Auth:** JWT + bcrypt issued by the Express server (Supabase Auth is **not** used; the `auth_users` table holds email + bcrypt hash)
- **Charts:** Recharts
- **Barcodes:** react-barcode, jsbarcode
- **PDF:** jsPDF + jspdf-autotable
- **Package Manager:** npm

## Project Structure

- `server.js` — Express server. Hosts Vite in development (and the built `dist` in production), proxies database requests to Supabase, handles auth (JWT + bcrypt), uploads, and a few librarian-only endpoints.
- `supabase_schema.sql` — One-time schema to paste into Supabase → SQL Editor.
- `electron/main.cjs` — Electron main process (spawns the Express server).
- `electron/preload.cjs` — Electron preload (exposes `window.shelfmaster`).
- `src/` — React source (flat layout)
  - `localDbClient.js` — Browser client mimicking the Supabase API; routes calls through the Express server.
  - `localDbAdmin.js` — Re-export used by librarian/admin screens.
  - …feature components (Inventory, ProcessReturns, PendingRequests, etc.)
- `public/` — Static assets, including `public/uploads/` for cover images and other uploads.

## Required Environment Variables

| Name | Where | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Replit Secrets | Your Supabase project URL (e.g. `https://xxxx.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Replit Secrets | Service-role key from Supabase → Settings → API. **Server-only** — never sent to the browser. |
| `JWT_SECRET` *(optional)* | Replit Secrets | Override the dev JWT secret. Defaults to `shelfmaster-local-dev-secret`. |
| `PORT` *(optional)* | env | Defaults to `5000`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` *(optional)* | Replit Secrets | Outbound email used for verification + notifications. When not set, the server falls back to console-logging the message **and returns the verification URL in the signup response** so signup is still completable in dev. |
| `APP_BASE_URL` *(optional)* | env | Public base URL used in verification emails (e.g. your `*.replit.app` URL). Defaults to `http://localhost:5000`. |

`server.js` loads `.env` automatically if present, but on Replit these come from Secrets.

## One-Time Supabase Setup

1. Open your Supabase project → **SQL Editor → New query**.
2. Paste the contents of [`supabase_schema.sql`](./supabase_schema.sql).
3. Click **Run**. The script is idempotent — safe to run again later.
4. Restart the workflow. The server log should print `[db] Supabase reachable at <your URL>`.

The first user account that registers through the app is automatically promoted to **librarian**, so a fresh database is administrable immediately.

## Database Schema (created by `supabase_schema.sql`)

### `auth_users`
`id`, `email` (unique), `password_hash` (bcrypt), `created_at`, `verified` (bool, default `false`), `verification_token` (text, single-use). Used by the Express server's JWT auth + email verification.

### `users`
Application profiles. `id`, `auth_id`, `name`, `student_id`, `course_year` *(legacy, kept for back-compat)*, **`grade_section`** (e.g. `Grade 11 - STEM`), **`lrn`** (12-digit Learner Reference Number), `role` (`student` / `librarian`), `status`, **`archived_at`** (nullable timestamp; non-null = soft-deleted), `created_at`.

### `books`
Title-level book record. `quantity` = number of currently available copies.

### `book_copies`
One row per physical copy.
`id`, `book_id` (FK→books, cascade), `copy_number`, `accession_id` (e.g. `LIB-2026-000001`, unique), `status` (available/borrowed/damaged/lost), `date_acquired`.

### `transactions`
`id`, `user_id`, `book_id`, `copy_id`, `status` (always one of `pending` / `borrowed` / `declined` / `returned`), `borrow_date`, `due_date`, `return_date`, **`fine_amount`** (numeric, populated when an overdue return is processed), plus walk-in borrower columns (`walk_in_*`, including `walk_in_lrn`, `walk_in_grade_section`).

### `site_content`
Single-row (`id = 1`) site configuration: hero banner, tagline, about/mission/vision, contact info, footer, **`fine_per_day`** (₱ per overdue day, defaults to 5).

### `notifications`
In-app notification feed. `id`, `user_id` (FK→users, cascade), `type`, `title`, `body`, `read`, `created_at`. Inserted by the server whenever a librarian approves/declines a request or processes a return; the same call also tries to send the message via SMTP (or logs it to the console when SMTP is not configured).

## Per-Copy Barcode System

- **Accession ID format:** `LIB-YYYY-NNNNNN` (6-digit global counter, e.g. `LIB-2026-000001`).
- Adding a book with qty=5 auto-generates 5 copies with sequential accession IDs.
- Each copy's barcode label is printed separately (Code 128).
- **Borrow:** Librarian approves → system assigns the next available copy → links `copy_id` to the transaction.
- **Return:** Staff scans copy barcode → exact copy found → marked available → student's loan closed.

## API Surface

- **Auth & verification**
  - `POST /api/auth/signup` — Issues a verification token, emails a link, and returns `{ verified, verifyUrl?, mailer }`. The first account ever registered is auto-promoted to **librarian** *and* auto-verified.
  - `POST /api/auth/login` — Rejects accounts where `auth_users.verified = false` with HTTP 403 (`needs_verification`).
  - `GET /api/auth/verify?token=…` and `POST /api/auth/verify { token }` — Consumes the single-use token and flips `verified = true`.
  - `POST /api/auth/resend-verification { email }` — Reissues the token + email.
  - `GET /api/auth/user`
- **Generic data proxy**
  - `POST /api/db/query` — used by `localDbClient.js`. Supports `select`, `insert`, `update` against the allow-listed tables (`users`, `books`, `book_copies`, `transactions`, `site_content`, `notifications`). Relation syntax like `'*, books(*), users(*)'` is passed straight through.
- **Librarian-only**
  - `POST /api/books/:id/archive`, `POST /api/books/:id/unarchive`, `DELETE /api/books/:id`
  - `POST /api/users/:id/archive`, `POST /api/users/:id/unarchive`, `DELETE /api/users/:id`
  - `POST /api/ebooks`, `PATCH /api/ebooks/:id`
  - `POST /api/storage/upload` — uploads book cover images to Supabase Storage (`book-covers` bucket, public) and returns the public URL
  - `POST /api/notifications` — `{ user_id, type, title, body }`. Inserts a row into `notifications` and emails the recipient (or logs the message if SMTP is not configured).
- `GET /api/health`, `GET /api/test`, `GET /api/lan-info`

## Borrow / Return / Fine Flow

- **Students** request a book through the catalog **Borrow Modal**, choosing a *quantity* and a *desired return date*. The frontend inserts N pending transactions with the same `due_date`.
- **Librarians** see each request in *Pending Requests* (with the patron's LRN, grade & section, and the date they asked to return by). One-click **Approve** sets the transaction to `borrowed`, assigns the next available `book_copies` row, decrements `books.quantity`, and emails the patron. **Decline** sets it to `declined` and emails the patron. There is no more status-probing — the constraint must accept `borrowed` and `declined`.
- The same page lists **active loans** with a green **Return** button (red **Return + Fine** when overdue). Returning an overdue book pops a prompt pre-filled with `overdue_days × site_content.fine_per_day`; the librarian can accept, edit, or waive (set 0). The amount is written to `transactions.fine_amount`, the copy is freed, stock is restocked, and the patron is notified.
- The fine rate is configurable from **Site Settings → Library Policy → Overdue Fine Per Day (₱)**.
- **Walk-in borrowing** uses the same hard-coded `borrowed` status and supports bulk lending in one submission (one transaction per book, with per-book due-day inputs for students).

Librarian-only endpoints verify the caller's role by joining the JWT subject (`auth_id`) to the `users` table.

## Responsive Design

The app is designed to work across phones, tablets, and desktops:

- **Public navbar / hero / about / footer / contact / search** — declared in `src/index.css` with `flex-wrap`, `clamp()` font sizes, and explicit `@media (max-width: 1024px / 768px / 480px)` breakpoints that stack columns and tighten padding on smaller screens.
- **Public Home, Login, Signup, Student pages** — use the `useResponsive()` hook (`src/useResponsive.js`) to switch grid columns, paddings, and font sizes between mobile/tablet/desktop.
- **Student navbar** — collapses to a hamburger drawer on mobile (`src/StudentNavbar.jsx`).
- **Librarian portal** — the sidebar in `src/LibrarianLayout.jsx` becomes a slide-in drawer on mobile, controlled by a fixed hamburger button (`.sidebar-toggle`) and a click-away overlay (`.sidebar-overlay`). The drawer auto-closes on route changes.
- **Librarian tables** (Inventory, BorrowingHistory, PendingRequests, etc.) — gain horizontal scrolling inside their card containers on `max-width: 768px` via global rules on `.admin-content table`.

## Development

```bash
npm install
npm run dev   # starts Express + Vite on port 5000
```

The Replit workflow `Start application` runs `cd Shelfmaster && npm run dev` and exposes port 5000 in the webview.

## Vercel Deployment

The app is structured for Vercel deployment:
- **Frontend** (`dist/`) — served by Vercel's CDN after `vite build`
- **Backend** (`api/index.js`) — wraps the Express app as a Vercel serverless function
- **Routing** (`vercel.json`) — `/api/*` → serverless function, everything else → `index.html` SPA fallback
- **File uploads** — stored in Supabase Storage (`book-covers` bucket, auto-created on startup)

### Steps to deploy on Vercel
1. Push the `Shelfmaster/` folder to a GitHub repo (set it as the **Root Directory** in Vercel)
2. In Vercel → Project Settings → Environment Variables, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
   - `APP_BASE_URL` → set to your Vercel deployment URL (e.g. `https://shelfmaster.vercel.app`)
3. Deploy — Vercel runs `npm run build` then serves `dist/` + the serverless function
