-- ============================================================
-- ShelfMaster Database Schema
-- Run this once in your Supabase project's SQL Editor.
--
-- Authentication is handled entirely by Supabase Auth.
-- This file sets up application tables only.
-- ============================================================

-- 1. Books ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.books (
  id             text PRIMARY KEY,
  accession_num  text,
  barcode        text,
  title          text NOT NULL,
  authors        text,
  quantity       integer DEFAULT 1,
  date_acquired  date,
  edition        text,
  pages          integer,
  book_type      text,
  subject_class  text,
  category       text,
  cost_price     numeric,
  publisher      text,
  isbn           text,
  copyright      text,
  source         text,
  remark         text,
  status         text DEFAULT 'active',
  cover_image    text,
  created_at     timestamptz DEFAULT now()
);

-- 2. Users (public profile; auth_id links to Supabase Auth UUID) ──
CREATE TABLE IF NOT EXISTS public.users (
  id             text PRIMARY KEY,
  auth_id        text UNIQUE,   -- Supabase Auth user id (uuid)
  name           text,
  student_id     text,
  course_year    text,
  grade_section  text,
  lrn            text,
  role           text DEFAULT 'student',
  status         text DEFAULT 'active',
  archived_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- 3. Book copies ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.book_copies (
  id             text PRIMARY KEY,
  book_id        text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  copy_number    integer NOT NULL DEFAULT 1,
  accession_id   text NOT NULL UNIQUE,
  status         text NOT NULL DEFAULT 'available',
  date_acquired  date,
  created_at     timestamptz DEFAULT now()
);

-- 4. Fines (created before transactions to avoid circular FK) ──
CREATE TABLE IF NOT EXISTS public.fines (
  id             text PRIMARY KEY,
  transaction_id text,           -- FK added after transactions table exists
  user_id        text REFERENCES public.users(id) ON DELETE SET NULL,
  amount         numeric DEFAULT 0,
  status         text DEFAULT 'unpaid',
  created_at     timestamptz DEFAULT now(),
  paid_at        timestamptz
);

-- 5. Transactions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id                    text PRIMARY KEY,
  user_id               text REFERENCES public.users(id) ON DELETE SET NULL,
  book_id               text REFERENCES public.books(id) ON DELETE SET NULL,
  copy_id               text REFERENCES public.book_copies(id) ON DELETE SET NULL,
  status                text DEFAULT 'pending',
  borrow_date           timestamptz,
  due_date              timestamptz,
  return_date           timestamptz,
  fine_amount           numeric DEFAULT 0,
  fine_id               text REFERENCES public.fines(id) ON DELETE SET NULL,
  walk_in_name          text,
  walk_in_grade_section text,
  walk_in_lrn           text,
  walk_in_teacher       text,
  walk_in_employee_id   text,
  walk_in_department    text,
  walk_in_contact       text,
  walk_in_position      text,
  created_at            timestamptz DEFAULT now()
);

-- Add the circular FK from fines → transactions (now that transactions exists)
ALTER TABLE public.fines
  ADD CONSTRAINT IF NOT EXISTS fines_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- 6. Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id             text PRIMARY KEY,
  user_id        text REFERENCES public.users(id) ON DELETE CASCADE,
  type           text NOT NULL,
  title          text NOT NULL,
  body           text,
  email_sent     boolean DEFAULT false,
  read           boolean DEFAULT false,
  fine_id        text REFERENCES public.fines(id) ON DELETE SET NULL,
  transaction_id text REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);

-- 7. Fine policy (single-row configuration) ───────────────────
CREATE TABLE IF NOT EXISTS public.fine_policy (
  id                integer PRIMARY KEY DEFAULT 1,
  fine_per_day      numeric DEFAULT 5,
  grace_period_days integer DEFAULT 0,
  max_fine          numeric DEFAULT 500,
  max_borrow_days   integer DEFAULT 7,
  max_borrow_count  integer DEFAULT 3
);

-- 8. Site content (single-row configuration) ──────────────────
CREATE TABLE IF NOT EXISTS public.site_content (
  id                    integer PRIMARY KEY DEFAULT 1,
  hero_banner_url       text,
  tagline               text,
  about_text            text,
  mission               text,
  vision                text,
  contact_email         text,
  contact_phone         text,
  contact_location      text,
  footer_text           text,
  borrow_duration_value integer DEFAULT 7,
  borrow_duration_unit  text DEFAULT 'days',
  fine_per_day          text,
  fine_amount           text,
  fine_increment_value  integer,
  fine_increment_type   text,
  strands               text DEFAULT '["STEM","HUMSS","ABM","GAS","TVL - Industrial Arts","TVL - Home Economics","TVL - ICT","TVL - Agri-Fishery Arts","Sports","Arts & Design"]'
);

-- ── Seed default single-row tables (idempotent) ───────────────
INSERT INTO public.fine_policy (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.site_content (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── Row Level Security ────────────────────────────────────────
-- The backend uses the service_role key which bypasses RLS.
-- Enable RLS so direct client-side queries can never bypass policies.
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_copies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fine_policy    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content   ENABLE ROW LEVEL SECURITY;
