-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.auth_users (
  id text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  verified boolean DEFAULT false,
  verification_token text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT auth_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.book_copies (
  id text NOT NULL,
  book_id text NOT NULL,
  copy_number integer NOT NULL DEFAULT 1,
  accession_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'available'::text,
  date_acquired date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT book_copies_pkey PRIMARY KEY (id),
  CONSTRAINT book_copies_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id)
);
CREATE TABLE public.books (
  id text NOT NULL,
  accession_num text,
  barcode text,
  title text NOT NULL,
  authors text,
  quantity integer DEFAULT 1,
  date_acquired date,
  edition text,
  pages integer,
  book_type text,
  subject_class text,
  category text,
  cost_price numeric,
  publisher text,
  isbn text,
  copyright text,
  source text,
  remark text,
  status text DEFAULT 'active'::text,
  cover_image text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT books_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id text NOT NULL,
  user_id text,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  email_sent boolean DEFAULT false,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  fine_id text,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.site_content (
  id integer NOT NULL,
  hero_banner_url text,
  tagline text,
  about_text text,
  mission text,
  vision text,
  contact_email text,
  contact_phone text,
  contact_location text,
  footer_text text,
  borrow_duration_value integer DEFAULT 7,
  borrow_duration_unit text DEFAULT 'days'::text,
  fine_per_day text,
  fine_amount text,
  fine_increment_value integer,
  fine_increment_type text,
  CONSTRAINT site_content_pkey PRIMARY KEY (id)
);
CREATE TABLE public.transactions (
  id text NOT NULL,
  user_id text,
  book_id text,
  copy_id text,
  status text DEFAULT 'pending'::text,
  borrow_date timestamp with time zone,
  due_date timestamp with time zone,
  return_date timestamp with time zone,
  fine_amount numeric DEFAULT 0,
  walk_in_name text,
  walk_in_grade_section text,
  walk_in_lrn text,
  walk_in_teacher text,
  walk_in_employee_id text,
  walk_in_department text,
  walk_in_contact text,
  created_at timestamp with time zone DEFAULT now(),
  fine_id text,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT transactions_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id),
  CONSTRAINT transactions_copy_id_fkey FOREIGN KEY (copy_id) REFERENCES public.book_copies(id)
);
CREATE TABLE public.users (
  id text NOT NULL,
  auth_id text,
  name text,
  student_id text,
  course_year text,
  grade_section text,
  lrn text,
  role text DEFAULT 'student'::text,
  status text DEFAULT 'active'::text,
  archived_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);