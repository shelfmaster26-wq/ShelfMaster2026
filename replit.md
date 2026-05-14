# ShelfMaster

A library management system for schools — handles book borrowing, returns, student accounts, librarian dashboard, fines, notifications, and eBook management.

## Run & Operate

- Frontend (ShelfMaster): workflow `artifacts/shelfmaster: web`
- Backend (API Server): workflow `artifacts/api-server: API Server`
- Required env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`
- Optional email env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + React Router DOM (JSX components in `artifacts/shelfmaster/src/`)
- Backend: Express 5 in `artifacts/api-server/` — proxies all Supabase queries and auth
- Database: Supabase (Postgres) — schema in `.migration-backup/supabase_schema.sql`
- Auth: Custom JWT via bcryptjs (stored in `auth_users` Supabase table)
- Email: Nodemailer (console mode by default; set SMTP env vars for real delivery)

## Where things live

- Frontend source: `artifacts/shelfmaster/src/` — JSX components, CSS in `index.css`
- Backend routes: `artifacts/api-server/src/routes/shelfmaster.ts` — all API endpoints
- Mailer: `artifacts/api-server/src/mailer.js`
- DB client (frontend): `artifacts/shelfmaster/src/localDbClient.js` — wraps `/api/db/query`
- Public assets: `artifacts/shelfmaster/public/` (logo, icons, library.jpg)

## Architecture decisions

- Frontend calls the Replit proxy path `/api/*` (no hardcoded IP:port — connectionManager is stubbed out)
- All Supabase access is server-side only; the frontend never holds service role keys
- JWT tokens are stored in `sessionStorage` under `shelfmaster-session`
- `localDbClient.js` mirrors the Supabase client API but routes through `/api/db/query`
- The first user registered automatically becomes a librarian (bootstrap protection)

## Product

- Public homepage with library search and category browsing
- Student portal: catalog, eBooks, borrowed books, profile
- Librarian portal: inventory management, user management, borrowing requests, returns, fines, history, walk-in transactions, settings
- Email notifications for verification, password reset, overdue books, borrow approvals/declines

## User preferences

- Keep JSX components as-is (`.jsx` files in `src/`)
- Original ShelfMaster styling with Cormorant Garamond + DM Sans fonts

## Gotchas

- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for any data to load
- The API server warns (but doesn't crash) if Supabase env vars are missing
- Run `supabase_schema.sql` in the Supabase SQL Editor for first-time DB setup
- `connectionManager.js` is stubbed — the app always uses relative `/api` paths

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Supabase schema: `.migration-backup/supabase_schema.sql`
