# ShelfMaster

A library management system for schools — handles book borrowing, returns, student accounts, librarian dashboard, fines, notifications, and eBook management.

## Run & Operate

- Dev: `npm run dev` (runs `node server.js` with Vite middleware — port 5000)
- Build: `npm run build` (Vite build to `dist/`)
- Production: `npm run start` (serves built `dist/` via Express)
- Required env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`
- Optional email env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Vercel Deployment

- `vercel.json` routes `/api/*` to the `api/index.js` serverless function
- `api/index.js` re-exports the Express app from `server.js`
- Frontend is a standard Vite build (`dist/` output)
- Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` in Vercel environment variables

## Stack

- Node.js, Express 5 — combined dev server + API
- React 19 + Vite — frontend (JSX, no TypeScript)
- Supabase (Postgres) — database; schema in `supabase_schema.sql`
- Auth: Custom JWT via bcryptjs (`auth_users` table)
- Email: Nodemailer (console mode by default; set SMTP env vars for real delivery)

## Where things live

- `src/` — all React JSX components and CSS
- `server.js` — Express backend (auth, books, users, transactions, fines, notifications, eBooks)
- `api/index.js` — Vercel serverless entry point (re-exports server.js)
- `mailer.js` — Nodemailer email helper
- `public/` — static assets (logo, icons, library.jpg)
- `vercel.json` — Vercel deployment configuration
- `supabase_schema.sql` — database schema (run in Supabase SQL Editor once)

## First-time Database Setup

Run `supabase_schema.sql` (or `setup_schema.sql` in `.migration-backup/`) in your Supabase project's SQL Editor. This creates all required tables in the correct order.

## User preferences

- Keep JSX components as-is (`.jsx` files in `src/`)
- Original ShelfMaster styling with Cormorant Garamond + DM Sans fonts

## Gotchas

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be set for any data to load
- The server warns on startup if the Supabase tables don't exist yet
- In dev, Vite middleware is used (HMR works); in production, `dist/` is served statically
