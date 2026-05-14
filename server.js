import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import crypto from 'node:crypto';
import compression from 'compression';
import helmet from 'helmet';
import { z } from 'zod';
import { sendMail, htmlEmail, getMailerMode } from './mailer.js';

// ── In-memory cache for rarely-changing tables ────────────────────────────────
const _cache = new Map();
function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.value;
}
function cacheSet(key, value, ttlMs = 60_000) {
  _cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
function cacheInvalidate(prefix) {
  for (const k of _cache.keys()) { if (k.startsWith(prefix)) _cache.delete(k); }
}

// ── Simple in-process rate limiter ────────────────────────────────────────────
const _rl = new Map();
function rateLimiter({ windowMs = 60_000, max = 120, keyPrefix = '' } = {}) {
  return (req, res, next) => {
    const key = keyPrefix + (req.ip || '');
    const now = Date.now();
    const rec = _rl.get(key);
    if (!rec || now > rec.resetAt) {
      _rl.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    rec.count++;
    if (rec.count > max) {
      res.status(429).json({ error: 'Too many requests. Please slow down.' });
      return;
    }
    next();
  };
}

// Stricter limiter for auth endpoints — 10 attempts per 15 minutes per IP
const authLimiter = rateLimiter({ windowMs: 15 * 60_000, max: 10, keyPrefix: 'auth:' });

const app = express();
const __httpServer = http.createServer(app);
const port = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === 'production';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jwtSecret = process.env.JWT_SECRET || 'shelfmaster-local-dev-secret';
const APP_BASE_URL = (process.env.APP_BASE_URL || '').replace(/\/+$/, '');

// ── Centralized error response ─────────────────────────────────────────────────
// Never expose raw DB/library error messages to clients in production.
function serverError(res, err, status = 500) {
  const msg = isProduction ? 'An unexpected error occurred.' : (err?.message || String(err));
  if (isProduction) console.error('[server error]', err?.message || err);
  res.status(status).json({ error: msg });
}

// ── CORS origin allowlist ─────────────────────────────────────────────────────
// Set ALLOWED_ORIGINS in env as a comma-separated list of Vercel deployment URLs.
// e.g. ALLOWED_ORIGINS=https://shelfmaster.vercel.app,https://shelfmaster-git-main.vercel.app
const _allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)
);
const _localhostRe = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
function isOriginAllowed(origin) {
  if (!origin) return true;                        // same-origin / server-to-server
  if (_allowedOrigins.has(origin)) return true;   // explicit allowlist
  if (!isProduction && _localhostRe.test(origin)) return true; // localhost in dev
  return false;
}

// ── Zod validation schemas ────────────────────────────────────────────────────
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

const signupSchema = z.object({
  email:    z.string().email('Invalid email address.').max(255),
  password: passwordSchema,
});
const loginSchema = z.object({
  email:    z.string().email('Invalid email address.').max(255),
  password: z.string().min(1).max(128),
});
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address.').max(255),
});
const resetPasswordSchema = z.object({
  token:    z.string().min(1).max(128),
  password: passwordSchema,
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n========================================');
  console.error(' ❌ Missing Supabase configuration');
  console.error('========================================');
  console.error(' Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
  console.error(' Find both values in your Supabase dashboard → Settings → API.');
  console.error('========================================\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});

// Allow-list of tables clients may query through /api/db/query.
const ALLOWED_TABLES = new Set(['users', 'books', 'book_copies', 'transactions', 'fines', 'fine_policy', 'site_content', 'notifications']);

// Allow-list of columns per table — prevents arbitrary column access via /api/db/query.
const TABLE_COLUMNS = {
  users:        ['id','auth_id','name','student_id','course_year','grade_section','lrn','role','status','archived_at','created_at'],
  books:        ['id','accession_num','barcode','title','authors','quantity','date_acquired','edition','pages','book_type','subject_class','category','cost_price','publisher','isbn','copyright','source','remark','status','cover_image','created_at'],
  book_copies:  ['id','book_id','copy_number','accession_id','status','date_acquired','created_at'],
  transactions: ['id','user_id','book_id','copy_id','status','borrow_date','due_date','return_date','fine_amount','walk_in_name','walk_in_grade_section','walk_in_lrn','walk_in_teacher','walk_in_employee_id','walk_in_department','walk_in_contact','walk_in_position','created_at','fine_id'],
  fines:        ['id','transaction_id','user_id','amount','status','created_at','paid_at'],
  fine_policy:  ['id','fine_per_day','grace_period_days','max_fine','max_borrow_days','max_borrow_count'],
  site_content: ['id','hero_banner_url','tagline','about_text','mission','vision','contact_email','contact_phone','contact_location','footer_text','borrow_duration_value','borrow_duration_unit','fine_per_day','fine_amount','fine_increment_value','fine_increment_type','strands'],
  notifications:['id','user_id','type','title','body','email_sent','read','created_at','fine_id','transaction_id'],
};

// Allowed MIME types and extensions for book cover uploads.
const ALLOWED_UPLOAD_MIME = new Set(['image/jpeg','image/png','image/webp','image/gif']);
const ALLOWED_UPLOAD_EXT  = new Set(['.jpg','.jpeg','.png','.webp','.gif']);
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB decoded

// Safe characters for Supabase select strings (columns, joins, aliases).
const SAFE_SELECT_RE = /^[\w\s,.*()!\-:]+$/;

function assertColumns(table, payload) {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed) return;
  for (const key of Object.keys(payload || {})) {
    if (!allowed.includes(key)) throw new Error(`Column '${key}' is not allowed on table '${table}'.`);
  }
}

function assertFilterColumns(table, filters) {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed) return;
  for (const f of (filters || [])) {
    if (f?.column && !allowed.includes(f.column))
      throw new Error(`Filter column '${f.column}' is not allowed on table '${table}'.`);
  }
}

function sanitizeSelect(select) {
  if (!select || select === '*') return select || '*';
  if (!SAFE_SELECT_RE.test(select)) throw new Error('Invalid select expression.');
  return select;
}

// ── Gzip all responses ────────────────────────────────────────────────────────
app.use(compression());

// ── Security headers via Helmet ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Vite/React manages its own CSP in dev
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow public assets
}));

// ── Rate limiter: 120 requests/min per IP ─────────────────────────────────────
app.use(rateLimiter({ windowMs: 60_000, max: 120 }));

app.use(express.json({ limit: '5mb' }));

// ── CORS — restricted to allowlisted origins ──────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (!isOriginAllowed(origin)) {
    res.status(403).json({ error: 'Origin not allowed.' });
    return;
  }
  next();
});


function getLanAddresses() {
  const result = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        result.push({ name, address: iface.address });
      }
    }
  }
  return result;
}

function assertTable(table) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error('Table is not allowed.');
  }
}

function cleanValue(value) {
  if (value === undefined || value === '') return null;
  return value;
}

function cleanPayload(table, payload) {
  assertColumns(table, payload);
  const cleaned = {};
  for (const [key, value] of Object.entries(payload || {})) {
    cleaned[key] = cleanValue(value);
  }
  if (table !== 'site_content' && !cleaned.id) {
    cleaned.id = uuidv4();
  }
  return cleaned;
}

function applyFilters(query, filters = []) {
  for (const filter of filters) {
    if (!filter || !filter.column) continue;
    switch (filter.op) {
      case 'eq':
        query = query.eq(filter.column, filter.value);
        break;
      case 'neq':
        query = query.neq(filter.column, filter.value);
        break;
      case 'gte':
        query = query.gte(filter.column, filter.value);
        break;
      case 'lt':
        query = query.lt(filter.column, filter.value);
        break;
      case 'in': {
        const list = Array.isArray(filter.value) ? filter.value : [];
        query = query.in(filter.column, list);
        break;
      }
      case 'ilike':
        query = query.ilike(filter.column, filter.value);
        break;
      default:
        break;
    }
  }
  return query;
}

async function selectRows({ table, select, filters, order, limit, options, single, maybeSingle }) {
  assertFilterColumns(table, filters);
  const safeSelect = sanitizeSelect(select);
  const wantsCount = options?.count;
  const headOnly = !!options?.head;
  const selectArgs = [safeSelect && safeSelect.length ? safeSelect : '*'];
  if (wantsCount || headOnly) {
    selectArgs.push({ count: wantsCount || 'exact', head: headOnly });
  }

  let query = supabase.from(table).select(...selectArgs);
  query = applyFilters(query, filters);

  if (order?.column) {
    query = query.order(order.column, { ascending: order.ascending !== false });
  }
  if (limit) {
    query = query.limit(Number(limit));
  }
  if (single) query = query.single();
  else if (maybeSingle) query = query.maybeSingle();

  const { data, error, count } = await query;
  return { data: data ?? null, error: error || null, count: count ?? (Array.isArray(data) ? data.length : data ? 1 : 0) };
}

async function insertRows({ table, payload, select, returning, single }) {
  const items = Array.isArray(payload) ? payload : [payload];
  const cleanedItems = items.map(item => cleanPayload(table, item));

  // Preserve old behaviour: the very first user account becomes a librarian
  // so a fresh database is administrable without manual SQL.
  if (table === 'users') {
    const { count, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    if (countError) {
      return { data: null, error: countError, count: 0 };
    }
    if ((count || 0) === 0) {
      cleanedItems.forEach(item => { item.role = 'librarian'; });
    }
  }

  let query = supabase.from(table).insert(cleanedItems);
  if (returning) {
    query = query.select(select && select.length ? select : '*');
    if (single) query = query.single();
  }

  const { data, error, count } = await query;
  return { data: data ?? null, error: error || null, count: count ?? (Array.isArray(data) ? data.length : 0) };
}

async function updateRows({ table, payload, filters, select, returning, single }) {
  const cleaned = cleanPayload(table, payload);
  delete cleaned.id;

  let query = supabase.from(table).update(cleaned);
  query = applyFilters(query, filters);

  if (returning) {
    query = query.select(select && select.length ? select : '*');
    if (single) query = query.single();
  }

  const { data, error, count } = await query;
  return { data: data ?? null, error: error || null, count: count ?? 0 };
}

async function deleteRows({ table, filters }) {
  let query = supabase.from(table).delete();
  query = applyFilters(query, filters);
  const { data, error, count } = await query;
  return { data: data ?? null, error: error || null, count: count ?? 0 };
}

async function getUserFromRequest(req) {
  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}

async function requireLibrarian(req, res) {
  const tokenUser = await getUserFromRequest(req);
  if (!tokenUser) {
    res.status(401).json({ error: 'Please sign in again before making this change.' });
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', tokenUser.id)
    .maybeSingle();

  if (error || !data || data.role !== 'librarian') {
    res.status(403).json({ error: 'Only librarian accounts can make this change.' });
    return null;
  }
  return tokenUser;
}

app.get('/api/health', async (_req, res) => {
  try {
    const { error } = await supabase.from('site_content').select('id').limit(1);
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ ok: true, database: 'supabase' });
  } catch (error) {
    serverError(res, error);
  }
});

app.get('/api/server-time', (_req, res) => {
  res.json({ now: new Date().toISOString() });
});

app.get('/api/test', (_req, res) => {
  res.json({ message: 'Server OK' });
});

app.get('/api/lan-info', (_req, res) => {
  res.json({ port, addresses: getLanAddresses() });
});

function buildVerifyUrl(req, token) {
  const base = APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/verify?token=${encodeURIComponent(token)}`;
}

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const email    = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;

    const { data: existing } = await supabase
      .from('auth_users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      res.status(400).json({ error: 'An account with that email already exists.' });
      return;
    }

    // shelfmaster26@gmail.com is the designated librarian account —
    // it is auto-verified and does not need an email confirmation link.
    const ADMIN_EMAIL = 'shelfmaster26@gmail.com';
    const isAdminEmail = email === ADMIN_EMAIL;

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = isAdminEmail ? null : crypto.randomBytes(24).toString('hex');

    const { error } = await supabase
      .from('auth_users')
      .insert({
        id,
        email,
        password_hash: passwordHash,
        verified: isAdminEmail,
        verification_token: verificationToken,
      });
    if (error) throw error;

    let verifyUrl = null;
    if (!isAdminEmail) {
      verifyUrl = buildVerifyUrl(req, verificationToken);
      await sendMail({
        to: email,
        subject: 'Confirm your ShelfMaster account',
        html: htmlEmail({
          type: 'verify',
          heading: 'Welcome to ShelfMaster!',
          body: `Thank you for registering. To activate your account and start accessing the library system, please confirm your email address by clicking the button below.
                 <br><br>
                 If you did not create an account, you can safely ignore this email.
                 <br><br>
                 <span style="color:#94a3b8;font-size:12px">Button not working? Copy and paste this link into your browser:<br>
                 <span style="color:#0369a1;word-break:break-all">${verifyUrl}</span></span>`,
          ctaUrl: verifyUrl,
          ctaLabel: 'Verify My Email Address',
        }),
        text: `Welcome to ShelfMaster!\n\nPlease confirm your email address by visiting:\n${verifyUrl}\n\nIf you did not create an account, ignore this email.`,
      });
    }

    res.json({
      user: { id, email },
      verified: isAdminEmail,
      isAdmin: isAdminEmail,
      mailer: getMailerMode(),
      verifyUrl: getMailerMode() === 'console' && !isAdminEmail ? verifyUrl : null,
    });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const email    = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;

    const { data: authUser, error } = await supabase
      .from('auth_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;

    if (!authUser || !(await bcrypt.compare(password, authUser.password_hash))) {
      res.status(401).json({ error: 'Invalid login credentials' });
      return;
    }

    if (authUser.verified === false) {
      res.status(403).json({
        error: 'Please verify your email address before signing in. Check your inbox for the confirmation link.',
        code: 'email_not_verified',
      });
      return;
    }

    // Reject login for archived user accounts.
    const { data: profile } = await supabase
      .from('users')
      .select('archived_at')
      .eq('auth_id', authUser.id)
      .maybeSingle();
    if (profile?.archived_at) {
      res.status(403).json({ error: 'This account has been archived. Please contact a librarian.' });
      return;
    }

    const token = jwt.sign({ id: authUser.id, email: authUser.email }, jwtSecret, { expiresIn: '7d' });
    res.json({
      user: { id: authUser.id, email: authUser.email },
      session: { access_token: token, user: { id: authUser.id, email: authUser.email } },
    });
  } catch (error) {
    serverError(res, error);
  }
});

// Consumes the verification token sent in the signup email.
app.post('/api/auth/verify', authLimiter, async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) { res.status(400).json({ error: 'Missing token.' }); return; }

    const { data: row, error } = await supabase
      .from('auth_users')
      .select('id, email, verified')
      .eq('verification_token', token)
      .maybeSingle();
    if (error) throw error;
    if (!row) { res.status(400).json({ error: 'Invalid or expired verification link.' }); return; }
    if (row.verified) { res.json({ ok: true, alreadyVerified: true, email: row.email }); return; }

    const { error: updErr } = await supabase
      .from('auth_users')
      .update({ verified: true, verification_token: null })
      .eq('id', row.id);
    if (updErr) throw updErr;

    res.json({ ok: true, email: row.email });
  } catch (error) {
    serverError(res, error);
  }
});

// Re-sends the verification email if the user lost it.
app.post('/api/auth/resend-verification', authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) { res.status(400).json({ error: 'Email required.' }); return; }

    const { data: row } = await supabase
      .from('auth_users')
      .select('id, email, verified, verification_token')
      .eq('email', email)
      .maybeSingle();
    if (!row) { res.json({ ok: true }); return; } // don't leak existence
    if (row.verified) { res.json({ ok: true, alreadyVerified: true }); return; }

    const token = row.verification_token || crypto.randomBytes(24).toString('hex');
    if (!row.verification_token) {
      await supabase.from('auth_users').update({ verification_token: token }).eq('id', row.id);
    }

    const verifyUrl = buildVerifyUrl(req, token);
    await sendMail({
      to: email,
      subject: 'Confirm your ShelfMaster account',
      html: htmlEmail({
        type: 'verify',
        heading: 'Confirm Your Email Address',
        body: `We received a request to resend your account verification link. Click the button below to confirm your email address and activate your ShelfMaster account.
               <br><br>
               If you did not request this, you can safely ignore this email — your account will remain unverified.
               <br><br>
               <span style="color:#94a3b8;font-size:12px">Button not working? Copy and paste this link into your browser:<br>
               <span style="color:#0369a1;word-break:break-all">${verifyUrl}</span></span>`,
        ctaUrl: verifyUrl,
        ctaLabel: 'Verify My Email Address',
      }),
      text: `Confirm your ShelfMaster email address by visiting:\n${verifyUrl}\n\nIf you did not request this, ignore this email.`,
    });

    res.json({ ok: true, mailer: getMailerMode(), verifyUrl: getMailerMode() === 'console' ? verifyUrl : null });
  } catch (error) {
    serverError(res, error);
  }
});

// Sends a password reset email with a time-limited token.
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }
    const email = parsed.data.email.trim().toLowerCase();

    const { data: row } = await supabase
      .from('auth_users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    // Always respond the same way — don't leak whether the email exists
    if (!row) { res.json({ ok: true }); return; }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await supabase.from('auth_users').update({
      reset_token: token,
      reset_token_expires: expires,
    }).eq('id', row.id);

    const base = APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${base}/reset-password?token=${token}`;

    await sendMail({
      to: email,
      subject: 'Reset your ShelfMaster password',
      html: htmlEmail({
        type: 'reset',
        heading: 'Password Reset Request',
        body: `We received a request to reset the password for the ShelfMaster account associated with this email address.
               <br><br>
               Click the button below to choose a new password. For your security, this link will expire in <strong style="color:#b45309">1 hour</strong>.
               <br><br>
               If you did not request a password reset, no action is needed — your current password will remain unchanged and this link will expire automatically.
               <br><br>
               <span style="color:#94a3b8;font-size:12px">Button not working? Copy and paste this link into your browser:<br>
               <span style="color:#0369a1;word-break:break-all">${resetUrl}</span></span>`,
        ctaUrl: resetUrl,
        ctaLabel: 'Reset My Password',
      }),
      text: `Reset your ShelfMaster password by visiting:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request a reset, ignore this email.`,
    });

    res.json({ ok: true, mailer: getMailerMode(), resetUrl: getMailerMode() === 'console' ? resetUrl : null });
  } catch (error) {
    serverError(res, error);
  }
});

// Validates the reset token and updates the password.
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }
    const token    = parsed.data.token.trim();
    const password = parsed.data.password;

    const { data: row } = await supabase
      .from('auth_users')
      .select('id, reset_token_expires')
      .eq('reset_token', token)
      .maybeSingle();

    if (!row) { res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' }); return; }
    if (row.reset_token_expires && new Date(row.reset_token_expires) < new Date()) {
      res.status(400).json({ error: 'This reset link has expired. Please request a new one.' }); return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await supabase.from('auth_users').update({
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expires: null,
    }).eq('id', row.id);

    res.json({ ok: true });
  } catch (error) {
    serverError(res, error);
  }
});

app.get('/api/auth/user', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }
  res.json({ user: { id: user.id, email: user.email } });
});

// Tables whose SELECT results are safe to cache briefly (read-heavy, rarely written).
const CACHEABLE_TABLES = new Set(['fine_policy', 'site_content']);

app.post('/api/db/query', async (req, res) => {
  try {
    const body = req.body || {};
    assertTable(body.table);

    // Serve from cache for read-only queries on stable tables.
    const isRead = !body.action || body.action === 'select';
    if (isRead && CACHEABLE_TABLES.has(body.table)) {
      const cacheKey = `db:${body.table}:${JSON.stringify(body.filters || [])}:${body.select || '*'}`;
      const cached = cacheGet(cacheKey);
      if (cached) { res.json(cached); return; }
      const result = await selectRows(body);
      cacheSet(cacheKey, result, 30_000); // 30s TTL
      res.json(result);
      return;
    }

    // Invalidate cache when these tables are written.
    if (!isRead && CACHEABLE_TABLES.has(body.table)) {
      cacheInvalidate(`db:${body.table}:`);
    }

    let result;
    if (body.action === 'insert') {
      result = await insertRows(body);
    } else if (body.action === 'update') {
      result = await updateRows(body);
    } else if (body.action === 'delete') {
      result = await deleteRows(body);
    } else {
      result = await selectRows(body);
    }

    res.json(result);
  } catch (error) {
    const msg = isProduction ? 'Database query failed.' : error.message;
    if (isProduction) console.error('[db/query error]', error.message);
    res.json({ data: null, error: { message: msg }, count: 0 });
  }
});

app.post('/api/books/:id/archive', async (req, res) => {
  if (!(await requireLibrarian(req, res))) return;
  try {
    const { data: activeLoans, error: loanErr } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('book_id', req.params.id)
      .in('status', ['borrowed', 'pending'])
      .limit(1);
    if (loanErr) throw loanErr;
    if (activeLoans && activeLoans.length > 0) {
      const hasPending = activeLoans.some(l => l.status === 'pending');
      const msg = hasPending
        ? 'Cannot archive a book that has pending borrow requests. Please approve or decline all pending requests first.'
        : 'Cannot archive a book that has active loans. Please ensure all copies are returned first.';
      res.status(400).json({ error: msg });
      return;
    }
    const { error } = await supabase.from('books').update({ status: 'archived' }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/api/books/:id/unarchive', async (req, res) => {
  if (!(await requireLibrarian(req, res))) return;
  try {
    const { error } = await supabase.from('books').update({ status: 'active' }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    serverError(res, error);
  }
});

app.delete('/api/books/:id', async (req, res) => {
  if (!(await requireLibrarian(req, res))) return;
  try {
    const { error } = await supabase.from('books').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    serverError(res, error);
  }
});

// --- User management (librarian-only) ---------------------------------------
app.post('/api/users/:id/archive', async (req, res) => {
  if (!(await requireLibrarian(req, res))) return;
  try {
    const { error } = await supabase
      .from('users')
      .update({ archived_at: new Date().toISOString(), status: 'archived' })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/api/users/:id/unarchive', async (req, res) => {
  if (!(await requireLibrarian(req, res))) return;
  try {
    const { error } = await supabase
      .from('users')
      .update({ archived_at: null, status: 'active' })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    serverError(res, error);
  }
});

// Hard-delete a user (and their auth row). Cascades to transactions via the
// FK on transactions.user_id (set null) and removes their auth credentials.
app.delete('/api/users/:id', async (req, res) => {
  if (!(await requireLibrarian(req, res))) return;
  try {
    const { data: u, error: fetchErr } = await supabase
      .from('users')
      .select('id, auth_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!u) { res.json({ ok: true, deleted: 0 }); return; }

    const { error: delProfile } = await supabase.from('users').delete().eq('id', u.id);
    if (delProfile) throw delProfile;
    if (u.auth_id) {
      await supabase.from('auth_users').delete().eq('id', u.auth_id);
    }
    res.json({ ok: true });
  } catch (error) {
    serverError(res, error);
  }
});

// --- Notifications -----------------------------------------------------------
// Insert an in-app notification AND send an email (if SMTP configured).
// Used by the librarian portal when approving/declining/charging fines.
app.post('/api/notifications', async (req, res) => {
  if (!(await requireLibrarian(req, res))) return;
  try {
    const userId = String(req.body?.user_id || '').trim();
    const type   = String(req.body?.type || 'general').trim();
    const title  = String(req.body?.title || '').trim();
    const body   = String(req.body?.body || '').trim();
    const fineId = req.body?.fine_id ? String(req.body.fine_id).trim() : null;
    if (!userId || !title) { res.status(400).json({ error: 'user_id and title are required.' }); return; }

    // Look up the recipient's email address.
    const { data: recipient } = await supabase
      .from('users')
      .select('id, name, auth_id')
      .eq('id', userId)
      .maybeSingle();
    let email = null;
    if (recipient?.auth_id) {
      const { data: au } = await supabase
        .from('auth_users')
        .select('email')
        .eq('id', recipient.auth_id)
        .maybeSingle();
      email = au?.email || null;
    }

    let emailSent = false;
    if (email) {
      const recipientName = recipient?.name ? `, ${recipient.name.split(' ')[0]}` : '';
      const greeting = `<p style="margin:0 0 16px;color:#64748b;font-size:14px">Hello${recipientName},</p>`;
      const formattedBody = greeting + body.replace(/\n/g, '<br>');
      const r = await sendMail({
        to: email,
        subject: `ShelfMaster — ${title}`,
        html: htmlEmail({ type, heading: title, body: formattedBody }),
        text: body,
      });
      emailSent = !!r.ok;
    }

    const id = uuidv4();
    const notifRow = { id, user_id: userId, type, title, body, email_sent: emailSent };
    if (fineId) notifRow.fine_id = fineId;
    const { error } = await supabase
      .from('notifications')
      .insert(notifRow);
    if (error) throw error;

    res.json({ ok: true, id, email_sent: emailSent, mailer: getMailerMode() });
  } catch (error) {
    serverError(res, error);
  }
});

// Notify all librarians by email when a student submits a borrow request.
// Any authenticated user (student or librarian) may call this endpoint.
app.post('/api/notify/librarians', async (req, res) => {
  const tokenUser = await getUserFromRequest(req);
  if (!tokenUser) {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }
  try {
    const bookTitle   = String(req.body?.book_title   || '').trim();
    const studentName = String(req.body?.student_name || '').trim();
    if (!bookTitle) { res.status(400).json({ error: 'book_title is required.' }); return; }

    const { data: librarians } = await supabase
      .from('users')
      .select('id, name, auth_id')
      .eq('role', 'librarian');

    if (!librarians || librarians.length === 0) {
      res.json({ ok: true, sent: 0 }); return;
    }

    const authIds = librarians.map(l => l.auth_id).filter(Boolean);
    const { data: authRows } = await supabase
      .from('auth_users')
      .select('email')
      .in('id', authIds);

    const emails = (authRows || []).map(r => r.email).filter(Boolean);
    if (emails.length === 0) { res.json({ ok: true, sent: 0 }); return; }

    const appUrl = APP_BASE_URL || '';
    const requesterLabel = studentName || 'A student';
    const subject = `ShelfMaster — New Borrow Request: "${bookTitle}"`;
    const bodyHtml = `
      <p style="margin:0 0 16px;color:#64748b;font-size:14px">Hello, Librarian,</p>
      A new borrow request has been submitted and is awaiting your review.
      <br><br>
      <table cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;width:100%;margin:18px 0">
        <tr>
          <td style="padding:18px 22px">
            <div style="margin-bottom:10px"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94a3b8">Book Title</span><br><strong style="font-size:15px;color:#1e293b">${bookTitle}</strong></div>
            <div><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94a3b8">Requested By</span><br><span style="font-size:15px;color:#1e293b">${requesterLabel}</span></div>
          </td>
        </tr>
      </table>
      Please log in to the librarian portal to approve or decline this request promptly.`;

    let sent = 0;
    for (const email of emails) {
      const r = await sendMail({
        to: email,
        subject,
        html: htmlEmail({
          type: 'pending',
          heading: 'New Borrow Request',
          body: bodyHtml,
          ctaUrl: appUrl ? `${appUrl}/librarian/requests` : undefined,
          ctaLabel: 'Review Requests',
        }),
        text: `New borrow request from ${requesterLabel} for "${bookTitle}". Log in to ShelfMaster to review it.`,
      });
      if (r.ok) sent++;
    }

    res.json({ ok: true, sent, mailer: getMailerMode() });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/api/ebooks', async (req, res) => {
  if (!(await requireLibrarian(req, res))) return;

  try {
    const title = String(req.body?.title || '').trim();
    const source = String(req.body?.url || '').trim();

    if (!title || !source) {
      res.status(400).json({ error: 'Please enter both an eBook title and URL.' });
      return;
    }

    const { data: lastRows, error: lastErr } = await supabase
      .from('books')
      .select('accession_num')
      .order('accession_num', { ascending: false })
      .limit(1);
    if (lastErr) throw lastErr;

    const lastNum = Number.parseInt(lastRows?.[0]?.accession_num, 10) || 0;
    const nextAcc = (lastNum + 1).toString().padStart(5, '0');
    const id = uuidv4();
    const today = new Date().toISOString().slice(0, 10);

    const { data: inserted, error: insertErr } = await supabase
      .from('books')
      .insert({
        id,
        accession_num: nextAcc,
        title,
        authors: 'eBook',
        quantity: 1,
        book_type: 'eBook',
        source,
        date_acquired: today,
        status: 'active',
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    res.json({ ok: true, ebook: inserted });
  } catch (error) {
    serverError(res, error);
  }
});

app.patch('/api/ebooks/:id', async (req, res) => {
  if (!(await requireLibrarian(req, res))) return;

  try {
    const title = String(req.body?.title || '').trim();
    const source = String(req.body?.url || '').trim();

    if (!title || !source) {
      res.status(400).json({ error: 'Please enter both an eBook title and URL.' });
      return;
    }

    const { error } = await supabase
      .from('books')
      .update({ title, source })
      .eq('id', req.params.id)
      .eq('book_type', 'eBook');
    if (error) throw error;

    res.json({ ok: true });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/api/storage/upload', async (req, res) => {
  if (!(await requireLibrarian(req, res))) return;

  try {
    const rawPath  = String(req.body?.path || '').replace(/^\/+/, '');
    const dataUrl  = String(req.body?.dataUrl || '');
    const match    = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);

    if (!rawPath || !match || rawPath.includes('..') || rawPath.includes('/./')) {
      res.status(400).json({ error: 'Invalid upload path.' });
      return;
    }

    const mimeType = match[1].toLowerCase();
    if (!ALLOWED_UPLOAD_MIME.has(mimeType)) {
      res.status(400).json({ error: 'File type not allowed. Use JPEG, PNG, WebP, or GIF.' });
      return;
    }

    // Sanitize filename — keep only safe characters, force allowed extension.
    const rawExt  = path.extname(rawPath).toLowerCase();
    const ext     = ALLOWED_UPLOAD_EXT.has(rawExt) ? rawExt : '.' + mimeType.split('/')[1];
    const safeName = path.basename(rawPath, rawExt).replace(/[^\w\-]/g, '_').slice(0, 80) + ext;
    const uploadPath = safeName;

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: 'Image exceeds the 4 MB limit.' });
      return;
    }

    const { error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(uploadPath, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('book-covers')
      .getPublicUrl(uploadPath);

    res.json({ ok: true, publicUrl });
  } catch (error) {
    serverError(res, error);
  }
});

// Finds all overdue borrowed transactions and notifies each student once per
// transaction (uses notifications.transaction_id to prevent duplicates).
async function runOverdueNotifications() {
  console.log('[overdue] Running overdue notification check...');
  try {
    const now = new Date().toISOString();

    const { data: overdue, error } = await supabase
      .from('transactions')
      .select('id, due_date, user_id, users(id, name, auth_id), books(title)')
      .eq('status', 'borrowed')
      .lt('due_date', now);

    if (error) throw error;
    if (!overdue || overdue.length === 0) {
      console.log('[overdue] No overdue transactions found.');
      return { sent: 0, skipped: 0 };
    }

    const txIds = overdue.map(tx => tx.id);
    const { data: existing } = await supabase
      .from('notifications')
      .select('transaction_id')
      .eq('type', 'overdue')
      .in('transaction_id', txIds);

    const alreadyNotified = new Set((existing || []).map(n => n.transaction_id));

    let sent = 0;
    let skipped = 0;

    for (const tx of overdue) {
      if (alreadyNotified.has(tx.id)) { skipped++; continue; }

      const userId    = tx.users?.id || tx.user_id;
      const userName  = tx.users?.name || 'Student';
      const firstName = userName.split(/[,\s]+/)[0] || 'Student';
      const bookTitle = tx.books?.title || 'a book';
      const dueLabel  = new Date(tx.due_date).toLocaleDateString('en-PH', { dateStyle: 'medium' });
      const daysOver  = Math.ceil((Date.now() - new Date(tx.due_date).getTime()) / 86400000);

      const title = 'Overdue Book — Please Return Immediately';
      const body  = `"${bookTitle}" was due on ${dueLabel} (${daysOver} day${daysOver !== 1 ? 's' : ''} ago). ` +
                    `Fines are accumulating. Please return the book to the library as soon as possible.`;

      let email = null;
      if (tx.users?.auth_id) {
        const { data: au } = await supabase
          .from('auth_users')
          .select('email')
          .eq('id', tx.users.auth_id)
          .maybeSingle();
        email = au?.email || null;
      }

      let emailSent = false;
      if (email) {
        const greeting  = `<p style="margin:0 0 16px;color:#64748b;font-size:14px">Hello ${firstName},</p>`;
        const bodyHtml  = `${greeting}
          <p style="margin:0 0 12px">The following book is <strong style="color:#dc2626">overdue</strong> and must be returned to the library immediately:</p>
          <table cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border-radius:10px;border:1px solid #fecaca;width:100%;margin:18px 0">
            <tr><td style="padding:18px 22px">
              <div style="margin-bottom:10px">
                <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94a3b8">Book Title</span><br>
                <strong style="font-size:15px;color:#1e293b">${bookTitle}</strong>
              </div>
              <div style="margin-bottom:10px">
                <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94a3b8">Due Date</span><br>
                <span style="font-size:15px;color:#dc2626;font-weight:700">${dueLabel}</span>
              </div>
              <div>
                <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94a3b8">Days Overdue</span><br>
                <span style="font-size:15px;color:#dc2626;font-weight:700">${daysOver} day${daysOver !== 1 ? 's' : ''}</span>
              </div>
            </td></tr>
          </table>
          <p style="margin:0;color:#64748b;font-size:14px">Fines are accumulating daily. Please visit the library to return the book and settle any outstanding fines.</p>`;

        const r = await sendMail({
          to: email,
          subject: `ShelfMaster — Overdue Book: "${bookTitle}"`,
          html: htmlEmail({ type: 'overdue', heading: title, body: bodyHtml }),
          text: body,
        });
        emailSent = !!r.ok;
      }

      await supabase.from('notifications').insert({
        id: uuidv4(),
        user_id: userId,
        type: 'overdue',
        title,
        body,
        email_sent: emailSent,
        transaction_id: tx.id,
      });

      sent++;
    }

    console.log(`[overdue] Done — sent: ${sent}, skipped (already notified): ${skipped}`);
    return { sent, skipped };
  } catch (err) {
    console.error('[overdue] Error:', err.message);
    return { sent: 0, skipped: 0, error: err.message };
  }
}

// Librarian-only endpoint to manually trigger overdue notifications.
app.post('/api/admin/overdue-notify', async (req, res) => {
  try {
    if (!(await requireLibrarian(req, res))) return;
    const result = await runOverdueNotifications();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[overdue-notify] Unhandled error:', err.message);
    serverError(res, err);
  }
});

// ── Global Express error handler ──────────────────────────────────────────────
// Catches any error passed via next(err) from route handlers.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  serverError(res, err);
});

// On Vercel, the frontend is served by the CDN — don't add any middleware.
// Locally, serve the built dist/ in production or use Vite middleware in dev.
if (!process.env.VERCEL) {
  if (isProduction) {
    // Long-lived cache for hashed assets (JS/CSS bundles), no-cache for HTML.
    app.use(express.static(path.join(__dirname, 'dist'), {
      maxAge: '1y',
      immutable: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }));
    app.get(/.*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const replitDomain = process.env.REPLIT_DEV_DOMAIN;
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: __httpServer, ...(replitDomain ? { protocol: 'wss', host: replitDomain, clientPort: 443 } : {}) },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }
}

async function ensureStorageBucket() {
  try {
    const { error } = await supabase.storage.createBucket('book-covers', { public: true });
    if (error && !error.message?.toLowerCase().includes('already exist') && !error.message?.toLowerCase().includes('duplicate')) {
      console.warn('[storage] Could not create book-covers bucket:', error.message);
    } else {
      console.log('[storage] book-covers bucket ready.');
    }
  } catch (err) {
    console.warn('[storage] Bucket check skipped:', err.message);
  }
}

async function checkSupabaseReachable() {
  try {
    const { error } = await supabase.from('site_content').select('id').limit(1);
    if (error && error.code === '42P01') {
      console.error('\n========================================');
      console.error(' ⚠️  Supabase reachable but tables are missing.');
      console.error('========================================');
      console.error(' Open your Supabase project → SQL Editor and run');
      console.error(' the contents of supabase_schema.sql once.');
      console.error('========================================\n');
      return;
    }
    if (error) throw error;
    console.log(`[db] Supabase reachable at ${SUPABASE_URL}`);
    await ensureStorageBucket();
    await runColumnMigrations();
    await runIndexRecommendations();
  } catch (err) {
    console.error('\n========================================');
    console.error(' ❌ Cannot reach Supabase');
    console.error('========================================');
    console.error(` URL:   ${SUPABASE_URL}`);
    console.error(` Error: ${err.message}`);
    console.error('========================================\n');
  }
}

async function runIndexRecommendations() {
  try {
    // Check for duplicate LRNs in the users table
    const { data: users } = await supabase
      .from('users')
      .select('lrn')
      .not('lrn', 'is', null);

    if (users) {
      const counts = {};
      for (const u of users) { if (u.lrn) counts[u.lrn] = (counts[u.lrn] || 0) + 1; }
      const dupes = Object.entries(counts).filter(([, n]) => n > 1).map(([lrn]) => lrn);

      if (dupes.length > 0) {
        console.warn('\n========================================');
        console.warn(' ⚠️  Duplicate LRNs detected in the users table:');
        console.warn('   ' + dupes.join(', '));
        console.warn(' Resolve these duplicates, then run in Supabase SQL Editor:');
        console.warn('   CREATE UNIQUE INDEX IF NOT EXISTS users_lrn_unique ON users (lrn) WHERE lrn IS NOT NULL;');
        console.warn('========================================\n');
      } else {
        console.log('[db] LRN uniqueness: OK (no duplicates). Recommended SQL to enforce at DB level:');
        console.log('     CREATE UNIQUE INDEX IF NOT EXISTS users_lrn_unique ON users (lrn) WHERE lrn IS NOT NULL;');
      }
    }
  } catch (err) {
    console.warn('[db] Could not check LRN uniqueness:', err.message);
  }
}

async function runColumnMigrations() {
  const migrations = [
    {
      check: () => supabase.from('transactions').select('walk_in_position').limit(1),
      sql: 'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS walk_in_position text;',
      label: 'walk_in_position',
    },
    {
      check: () => supabase.from('transactions').select('fine_id').limit(1),
      sql: 'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fine_id text REFERENCES fines(id) ON DELETE SET NULL;',
      label: 'transactions.fine_id',
    },
    {
      check: () => supabase.from('notifications').select('fine_id').limit(1),
      sql: 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS fine_id text REFERENCES fines(id) ON DELETE SET NULL;',
      label: 'notifications.fine_id',
    },
    {
      check: () => supabase.from('auth_users').select('reset_token').limit(1),
      sql: 'ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS reset_token text;',
      label: 'auth_users.reset_token',
    },
    {
      check: () => supabase.from('auth_users').select('reset_token_expires').limit(1),
      sql: 'ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS reset_token_expires timestamptz;',
      label: 'auth_users.reset_token_expires',
    },
    {
      check: () => supabase.from('fine_policy').select('max_borrow_count').limit(1),
      sql: 'ALTER TABLE fine_policy ADD COLUMN IF NOT EXISTS max_borrow_count integer DEFAULT 3;',
    },
    {
      check: () => supabase.from('site_content').select('strands').limit(1),
      sql: `ALTER TABLE site_content ADD COLUMN IF NOT EXISTS strands text DEFAULT '["STEM","HUMSS","ABM","GAS","TVL - Industrial Arts","TVL - Home Economics","TVL - ICT","TVL - Agri-Fishery Arts","Sports","Arts & Design"]';`,
      label: 'site_content.strands',
    },
    {
      check: () => supabase.from('notifications').select('transaction_id').limit(1),
      sql: 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS transaction_id text;',
      label: 'notifications.transaction_id',
    },
  ];

  const missing = [];
  for (const m of migrations) {
    const { error } = await m.check();
    if (error && error.code === '42703') missing.push(m);
  }

  if (missing.length === 0) {
    console.log('[db] Schema columns up to date.');
    return;
  }

  console.warn('\n========================================');
  console.warn(' ⚠️  Missing database columns detected.');
  console.warn('========================================');
  console.warn(' Run the following SQL in your Supabase project');
  console.warn(' → SQL Editor → New query → paste → Run:');
  console.warn('');
  for (const m of missing) console.warn('   ' + m.sql);
  console.warn('');
  console.warn(' Or re-run the full supabase_schema.sql file.');
  console.warn('========================================\n');
}

// On Vercel, the platform invokes the exported handler — no listener needed.
// Locally, start the server normally.
if (!process.env.VERCEL) {
  // Keep connections alive longer under high concurrency.
  __httpServer.keepAliveTimeout = 65_000;
  __httpServer.headersTimeout   = 70_000;
  __httpServer.listen(port, '0.0.0.0', async () => {
    console.log(`ShelfMaster running on port ${port}`);
    console.log(`[mailer] mode = ${getMailerMode()}${getMailerMode() === 'console' ? ' (set SMTP_HOST/SMTP_USER/SMTP_PASS to send real email)' : ''}`);
    await checkSupabaseReachable();
    // Run overdue check once at startup, then every 24 hours.
    setTimeout(async () => {
      await runOverdueNotifications();
      setInterval(runOverdueNotifications, 24 * 60 * 60 * 1000);
    }, 10000); // 10s delay to let DB connection settle
  });
} else {
  checkSupabaseReachable();
}

export default app;