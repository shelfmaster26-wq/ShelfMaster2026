import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { sendMail, htmlEmail, getMailerMode } from "../mailer.js";

const router: IRouter = Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET || "shelfmaster-local-dev-secret";
const APP_BASE_URL = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const ALLOWED_TABLES = new Set([
  "users", "books", "book_copies", "transactions", "fines", "fine_policy",
  "site_content", "notifications",
]);

const _cache = new Map<string, { value: unknown; expiresAt: number }>();
function cacheGet(key: string) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.value;
}
function cacheSet(key: string, value: unknown, ttlMs = 60_000) {
  _cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
function cacheInvalidate(prefix: string) {
  for (const k of _cache.keys()) { if (k.startsWith(prefix)) _cache.delete(k); }
}

const CACHEABLE_TABLES = new Set(["fine_policy", "site_content"]);

function assertTable(table: string) {
  if (!ALLOWED_TABLES.has(table)) throw new Error("Table is not allowed.");
}

function cleanValue(value: unknown) {
  if (value === undefined || value === "") return null;
  return value;
}

function cleanPayload(table: string, payload: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload || {})) {
    cleaned[key] = cleanValue(value);
  }
  if (table !== "site_content" && !cleaned.id) {
    cleaned.id = uuidv4();
  }
  return cleaned;
}

type Filter = { column?: string; op?: string; value?: unknown };
function applyFilters(query: ReturnType<typeof supabase.from>, filters: Filter[] = []) {
  for (const filter of filters) {
    if (!filter || !filter.column) continue;
    switch (filter.op) {
      case "eq": query = query.eq(filter.column, filter.value); break;
      case "neq": query = query.neq(filter.column, filter.value); break;
      case "gte": query = query.gte(filter.column, filter.value); break;
      case "lt": query = query.lt(filter.column, filter.value); break;
      case "in": {
        const list = Array.isArray(filter.value) ? filter.value : [];
        query = query.in(filter.column, list);
        break;
      }
      case "ilike": query = query.ilike(filter.column, filter.value as string); break;
    }
  }
  return query;
}

async function selectRows(body: Record<string, unknown>) {
  if (!supabase) return { data: null, error: { message: "Supabase not configured" }, count: 0 };
  const { table, select, filters, order, limit, options, single, maybeSingle } = body as Record<string, unknown>;
  const wantsCount = (options as Record<string, unknown>)?.count;
  const headOnly = !!(options as Record<string, unknown>)?.head;
  const selectArgs: unknown[] = [(select && (select as string).length ? select : "*")];
  if (wantsCount || headOnly) {
    selectArgs.push({ count: wantsCount || "exact", head: headOnly });
  }

  let query = (supabase.from(table as string) as ReturnType<typeof supabase.from>).select(...(selectArgs as [string, ...unknown[]]));
  query = applyFilters(query, (filters as Filter[]) || []);
  if ((order as Record<string, unknown>)?.column) {
    query = query.order((order as Record<string, unknown>).column as string, { ascending: (order as Record<string, unknown>).ascending !== false });
  }
  if (limit) query = query.limit(Number(limit));
  if (single) query = query.single();
  else if (maybeSingle) query = query.maybeSingle();

  const { data, error, count } = await query;
  return { data: data ?? null, error: error || null, count: count ?? (Array.isArray(data) ? data.length : data ? 1 : 0) };
}

async function insertRows(body: Record<string, unknown>) {
  if (!supabase) return { data: null, error: { message: "Supabase not configured" }, count: 0 };
  const { table, payload, select, returning, single } = body as Record<string, unknown>;
  const items = Array.isArray(payload) ? payload : [payload];
  const cleanedItems = (items as Record<string, unknown>[]).map(item => cleanPayload(table as string, item));

  if (table === "users") {
    const { count, error: countError } = await supabase.from("users").select("id", { count: "exact", head: true });
    if (countError) return { data: null, error: countError, count: 0 };
    if ((count || 0) === 0) {
      cleanedItems.forEach(item => { item.role = "librarian"; });
    }
  }

  let query = supabase.from(table as string).insert(cleanedItems);
  if (returning) {
    query = query.select(select && (select as string).length ? select as string : "*");
    if (single) (query as ReturnType<typeof supabase.from>).single();
  }

  const { data, error, count } = await query;
  return { data: data ?? null, error: error || null, count: count ?? (Array.isArray(data) ? data.length : 0) };
}

async function updateRows(body: Record<string, unknown>) {
  if (!supabase) return { data: null, error: { message: "Supabase not configured" }, count: 0 };
  const { table, payload, filters, select, returning, single } = body as Record<string, unknown>;
  const cleaned = cleanPayload(table as string, payload as Record<string, unknown>);
  delete cleaned.id;

  let query = supabase.from(table as string).update(cleaned);
  query = applyFilters(query, (filters as Filter[]) || []);
  if (returning) {
    query = query.select(select && (select as string).length ? select as string : "*");
    if (single) (query as ReturnType<typeof supabase.from>).single();
  }

  const { data, error, count } = await query;
  return { data: data ?? null, error: error || null, count: count ?? 0 };
}

async function deleteRows(body: Record<string, unknown>) {
  if (!supabase) return { data: null, error: { message: "Supabase not configured" }, count: 0 };
  const { table, filters } = body as Record<string, unknown>;
  let query = supabase.from(table as string).delete();
  query = applyFilters(query, (filters as Filter[]) || []);
  const { data, error, count } = await query;
  return { data: data ?? null, error: error || null, count: count ?? 0 };
}

async function getUserFromRequest(req: Request) {
  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  try {
    return jwt.verify(token, jwtSecret) as { id: string; email: string };
  } catch {
    return null;
  }
}

async function requireLibrarian(req: Request, res: Response) {
  const tokenUser = await getUserFromRequest(req);
  if (!tokenUser) {
    res.status(401).json({ error: "Please sign in again before making this change." });
    return null;
  }
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return null; }
  const { data, error } = await supabase.from("users").select("role").eq("auth_id", tokenUser.id).maybeSingle();
  if (error || !data || data.role !== "librarian") {
    res.status(403).json({ error: "Only librarian accounts can make this change." });
    return null;
  }
  return tokenUser;
}

function buildVerifyUrl(req: Request, token: string) {
  const base = APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/verify?token=${encodeURIComponent(token)}`;
}

router.get("/health", async (_req, res) => {
  if (!supabase) { res.status(500).json({ ok: false, error: "Supabase not configured" }); return; }
  try {
    const { error } = await supabase.from("site_content").select("id").limit(1);
    if (error && error.code !== "PGRST116") throw error;
    res.json({ ok: true, database: "supabase" });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get("/server-time", (_req, res) => {
  res.json({ now: new Date().toISOString() });
});

router.get("/test", (_req, res) => {
  res.json({ message: "Server OK" });
});

router.get("/lan-info", (_req, res) => {
  res.json({ port: process.env.PORT, addresses: [] });
});

router.post("/auth/signup", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) { res.status(400).json({ error: "Email and password are required." }); return; }

    const { data: existing } = await supabase.from("auth_users").select("id").eq("email", email).maybeSingle();
    if (existing) { res.status(400).json({ error: "An account with that email already exists." }); return; }

    const ADMIN_EMAIL = "shelfmaster26@gmail.com";
    const isAdminEmail = email === ADMIN_EMAIL;
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = isAdminEmail ? null : crypto.randomBytes(24).toString("hex");

    const { error } = await supabase.from("auth_users").insert({ id, email, password_hash: passwordHash, verified: isAdminEmail, verification_token: verificationToken });
    if (error) throw error;

    let verifyUrl = null;
    if (!isAdminEmail) {
      verifyUrl = buildVerifyUrl(req, verificationToken as string);
      await sendMail({
        to: email,
        subject: "Confirm your ShelfMaster account",
        html: htmlEmail({ type: "verify", heading: "Welcome to ShelfMaster!", body: `Thank you for registering. Please confirm your email.<br><br><span style="color:#94a3b8;font-size:12px">Verify link: ${verifyUrl}</span>`, ctaUrl: verifyUrl, ctaLabel: "Verify My Email Address" }),
        text: `Confirm your email: ${verifyUrl}`,
      });
    }

    res.json({ user: { id, email }, verified: isAdminEmail, isAdmin: isAdminEmail, mailer: getMailerMode(), verifyUrl: getMailerMode() === "console" && !isAdminEmail ? verifyUrl : null });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/auth/login", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    const { data: authUser, error } = await supabase.from("auth_users").select("*").eq("email", email).maybeSingle();
    if (error) throw error;

    if (!authUser || !(await bcrypt.compare(password, authUser.password_hash))) {
      res.status(401).json({ error: "Invalid login credentials" }); return;
    }
    if (authUser.verified === false) {
      res.status(403).json({ error: "Please verify your email address before signing in.", code: "email_not_verified" }); return;
    }

    const { data: profile } = await supabase.from("users").select("archived_at").eq("auth_id", authUser.id).maybeSingle();
    if (profile?.archived_at) {
      res.status(403).json({ error: "This account has been archived. Please contact a librarian." }); return;
    }

    const token = jwt.sign({ id: authUser.id, email: authUser.email }, jwtSecret, { expiresIn: "7d" });
    res.json({ user: { id: authUser.id, email: authUser.email }, session: { access_token: token, user: { id: authUser.id, email: authUser.email } } });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/auth/verify", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  try {
    const token = String(req.body?.token || "").trim();
    if (!token) { res.status(400).json({ error: "Missing token." }); return; }
    const { data: row, error } = await supabase.from("auth_users").select("id, email, verified").eq("verification_token", token).maybeSingle();
    if (error) throw error;
    if (!row) { res.status(400).json({ error: "Invalid or expired verification link." }); return; }
    if (row.verified) { res.json({ ok: true, alreadyVerified: true, email: row.email }); return; }
    await supabase.from("auth_users").update({ verified: true, verification_token: null }).eq("id", row.id);
    res.json({ ok: true, email: row.email });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/auth/resend-verification", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) { res.status(400).json({ error: "Email required." }); return; }
    const { data: row } = await supabase.from("auth_users").select("id, email, verified, verification_token").eq("email", email).maybeSingle();
    if (!row) { res.json({ ok: true }); return; }
    if (row.verified) { res.json({ ok: true, alreadyVerified: true }); return; }
    const token = row.verification_token || crypto.randomBytes(24).toString("hex");
    if (!row.verification_token) {
      await supabase.from("auth_users").update({ verification_token: token }).eq("id", row.id);
    }
    const verifyUrl = buildVerifyUrl(req, token);
    await sendMail({ to: email, subject: "Confirm your ShelfMaster account", html: htmlEmail({ type: "verify", heading: "Confirm Your Email Address", body: `Verify link: ${verifyUrl}`, ctaUrl: verifyUrl, ctaLabel: "Verify My Email Address" }), text: `Confirm your email: ${verifyUrl}` });
    res.json({ ok: true, mailer: getMailerMode(), verifyUrl: getMailerMode() === "console" ? verifyUrl : null });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) { res.status(400).json({ error: "Email is required." }); return; }
    const { data: row } = await supabase.from("auth_users").select("id, email").eq("email", email).maybeSingle();
    if (!row) { res.json({ ok: true }); return; }
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from("auth_users").update({ reset_token: token, reset_token_expires: expires }).eq("id", row.id);
    const base = APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const resetUrl = `${base}/reset-password?token=${token}`;
    await sendMail({ to: email, subject: "Reset your ShelfMaster password", html: htmlEmail({ type: "reset", heading: "Password Reset Request", body: `Click below to reset your password. Link expires in 1 hour.<br><br><span style="color:#94a3b8;font-size:12px">${resetUrl}</span>`, ctaUrl: resetUrl, ctaLabel: "Reset My Password" }), text: `Reset your password: ${resetUrl}` });
    res.json({ ok: true, mailer: getMailerMode(), resetUrl: getMailerMode() === "console" ? resetUrl : null });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");
    if (!token) { res.status(400).json({ error: "Reset token is required." }); return; }
    if (!password) { res.status(400).json({ error: "New password is required." }); return; }
    if (password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters." }); return; }
    const { data: row } = await supabase.from("auth_users").select("id, reset_token_expires").eq("reset_token", token).maybeSingle();
    if (!row) { res.status(400).json({ error: "Invalid or expired reset link." }); return; }
    if (row.reset_token_expires && new Date(row.reset_token_expires) < new Date()) {
      res.status(400).json({ error: "This reset link has expired." }); return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await supabase.from("auth_users").update({ password_hash: passwordHash, reset_token: null, reset_token_expires: null }).eq("id", row.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/auth/user", async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) { res.status(401).json({ error: "Not signed in." }); return; }
  res.json({ user: { id: user.id, email: user.email } });
});

router.post("/db/query", async (req, res) => {
  try {
    const body = req.body || {};
    assertTable(body.table);
    const isRead = !body.action || body.action === "select";
    if (isRead && CACHEABLE_TABLES.has(body.table)) {
      const cacheKey = `db:${body.table}:${JSON.stringify(body.filters || [])}:${body.select || "*"}`;
      const cached = cacheGet(cacheKey);
      if (cached) { res.json(cached); return; }
      const result = await selectRows(body);
      cacheSet(cacheKey, result, 30_000);
      res.json(result);
      return;
    }
    if (!isRead && CACHEABLE_TABLES.has(body.table)) {
      cacheInvalidate(`db:${body.table}:`);
    }
    let result;
    if (body.action === "insert") result = await insertRows(body);
    else if (body.action === "update") result = await updateRows(body);
    else if (body.action === "delete") result = await deleteRows(body);
    else result = await selectRows(body);
    res.json(result);
  } catch (error) {
    res.json({ data: null, error: { message: (error as Error).message }, count: 0 });
  }
});

router.post("/books/:id/archive", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  if (!(await requireLibrarian(req, res))) return;
  try {
    const { data: activeLoans } = await supabase.from("transactions").select("id, status").eq("book_id", req.params.id).in("status", ["borrowed", "pending"]).limit(1);
    if (activeLoans && activeLoans.length > 0) {
      const hasPending = activeLoans.some((l: { status: string }) => l.status === "pending");
      res.status(400).json({ error: hasPending ? "Cannot archive a book that has pending borrow requests." : "Cannot archive a book that has active loans." });
      return;
    }
    await supabase.from("books").update({ status: "archived" }).eq("id", req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/books/:id/unarchive", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  if (!(await requireLibrarian(req, res))) return;
  try {
    await supabase.from("books").update({ status: "active" }).eq("id", req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete("/books/:id", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  if (!(await requireLibrarian(req, res))) return;
  try {
    await supabase.from("books").delete().eq("id", req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/users/:id/archive", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  if (!(await requireLibrarian(req, res))) return;
  try {
    await supabase.from("users").update({ archived_at: new Date().toISOString(), status: "archived" }).eq("id", req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/users/:id/unarchive", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  if (!(await requireLibrarian(req, res))) return;
  try {
    await supabase.from("users").update({ archived_at: null, status: "active" }).eq("id", req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete("/users/:id", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  if (!(await requireLibrarian(req, res))) return;
  try {
    const { data: u } = await supabase.from("users").select("id, auth_id").eq("id", req.params.id).maybeSingle();
    if (!u) { res.json({ ok: true, deleted: 0 }); return; }
    await supabase.from("users").delete().eq("id", u.id);
    if (u.auth_id) await supabase.from("auth_users").delete().eq("id", u.auth_id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/notifications", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  if (!(await requireLibrarian(req, res))) return;
  try {
    const userId = String(req.body?.user_id || "").trim();
    const type = String(req.body?.type || "general").trim();
    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "").trim();
    const fineId = req.body?.fine_id ? String(req.body.fine_id).trim() : null;
    if (!userId || !title) { res.status(400).json({ error: "user_id and title are required." }); return; }

    const { data: recipient } = await supabase.from("users").select("id, name, auth_id").eq("id", userId).maybeSingle();
    let email = null;
    if (recipient?.auth_id) {
      const { data: au } = await supabase.from("auth_users").select("email").eq("id", recipient.auth_id).maybeSingle();
      email = au?.email || null;
    }

    let emailSent = false;
    if (email) {
      const recipientName = recipient?.name ? `, ${recipient.name.split(" ")[0]}` : "";
      const greeting = `<p style="margin:0 0 16px;color:#64748b;font-size:14px">Hello${recipientName},</p>`;
      const formattedBody = greeting + body.replace(/\n/g, "<br>");
      const r = await sendMail({ to: email, subject: `ShelfMaster — ${title}`, html: htmlEmail({ type, heading: title, body: formattedBody }), text: body });
      emailSent = !!r.ok;
    }

    const id = uuidv4();
    const notifRow: Record<string, unknown> = { id, user_id: userId, type, title, body, email_sent: emailSent };
    if (fineId) notifRow.fine_id = fineId;
    const { error } = await supabase.from("notifications").insert(notifRow);
    if (error) throw error;
    res.json({ ok: true, id, email_sent: emailSent, mailer: getMailerMode() });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/notify/librarians", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  const tokenUser = await getUserFromRequest(req);
  if (!tokenUser) { res.status(401).json({ error: "Not signed in." }); return; }
  try {
    const bookTitle = String(req.body?.book_title || "").trim();
    const studentName = String(req.body?.student_name || "").trim();
    if (!bookTitle) { res.status(400).json({ error: "book_title is required." }); return; }

    const { data: librarians } = await supabase.from("users").select("id, name, auth_id").eq("role", "librarian");
    if (!librarians || librarians.length === 0) { res.json({ ok: true, sent: 0 }); return; }

    const authIds = librarians.map((l: { auth_id: string }) => l.auth_id).filter(Boolean);
    const { data: authRows } = await supabase.from("auth_users").select("email").in("id", authIds);
    const emails = (authRows || []).map((r: { email: string }) => r.email).filter(Boolean);
    if (emails.length === 0) { res.json({ ok: true, sent: 0 }); return; }

    const appUrl = APP_BASE_URL || "";
    const requesterLabel = studentName || "A student";
    let sent = 0;
    for (const email of emails) {
      const r = await sendMail({ to: email, subject: `ShelfMaster — New Borrow Request: "${bookTitle}"`, html: htmlEmail({ type: "pending", heading: "New Borrow Request", body: `${requesterLabel} requested "${bookTitle}". Log in to review.`, ctaUrl: appUrl ? `${appUrl}/librarian/requests` : undefined, ctaLabel: "Review Requests" }), text: `New borrow request from ${requesterLabel} for "${bookTitle}".` });
      if (r.ok) sent++;
    }
    res.json({ ok: true, sent, mailer: getMailerMode() });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/ebooks", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  if (!(await requireLibrarian(req, res))) return;
  try {
    const title = String(req.body?.title || "").trim();
    const source = String(req.body?.url || "").trim();
    if (!title || !source) { res.status(400).json({ error: "Please enter both an eBook title and URL." }); return; }

    const { data: lastRows } = await supabase.from("books").select("accession_num").order("accession_num", { ascending: false }).limit(1);
    const lastNum = Number.parseInt(lastRows?.[0]?.accession_num, 10) || 0;
    const nextAcc = (lastNum + 1).toString().padStart(5, "0");
    const id = uuidv4();
    const today = new Date().toISOString().slice(0, 10);

    const { data: inserted, error: insertErr } = await supabase.from("books").insert({ id, accession_num: nextAcc, title, authors: "eBook", quantity: 1, book_type: "eBook", source, date_acquired: today, status: "active" }).select().single();
    if (insertErr) throw insertErr;
    res.json({ ok: true, ebook: inserted });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.patch("/ebooks/:id", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  if (!(await requireLibrarian(req, res))) return;
  try {
    const title = String(req.body?.title || "").trim();
    const source = String(req.body?.url || "").trim();
    if (!title || !source) { res.status(400).json({ error: "Please enter both an eBook title and URL." }); return; }
    await supabase.from("books").update({ title, source }).eq("id", req.params.id).eq("book_type", "eBook");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/storage/upload", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  if (!(await requireLibrarian(req, res))) return;
  try {
    const uploadPath = String(req.body?.path || "").replace(/^\/+/, "");
    const dataUrl = String(req.body?.dataUrl || "");
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!uploadPath || !match || uploadPath.includes("..")) { res.status(400).json({ error: "Invalid upload." }); return; }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], "base64");

    const { error: uploadError } = await supabase.storage.from("book-covers").upload(uploadPath, buffer, { contentType: mimeType, upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("book-covers").getPublicUrl(uploadPath);
    res.json({ ok: true, publicUrl });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/admin/overdue-notify", async (req, res) => {
  if (!supabase) { res.status(500).json({ error: "Supabase not configured" }); return; }
  if (!(await requireLibrarian(req, res))) return;
  try {
    const now = new Date().toISOString();
    const { data: overdue, error } = await supabase.from("transactions").select("id, due_date, user_id, users(id, name, auth_id), books(title)").eq("status", "borrowed").lt("due_date", now);
    if (error) throw error;
    if (!overdue || overdue.length === 0) { res.json({ ok: true, sent: 0, skipped: 0 }); return; }

    const txIds = overdue.map((tx: { id: string }) => tx.id);
    const { data: existing } = await supabase.from("notifications").select("transaction_id").eq("type", "overdue").in("transaction_id", txIds);
    const alreadyNotified = new Set((existing || []).map((n: { transaction_id: string }) => n.transaction_id));

    let sent = 0;
    let skipped = 0;

    for (const tx of overdue) {
      if (alreadyNotified.has(tx.id)) { skipped++; continue; }
      const userId = tx.users?.id || tx.user_id;
      const userName = tx.users?.name || "Student";
      const firstName = userName.split(/[,\s]+/)[0] || "Student";
      const bookTitle = tx.books?.title || "a book";
      const dueLabel = new Date(tx.due_date).toLocaleDateString("en-PH", { dateStyle: "medium" });
      const daysOver = Math.ceil((Date.now() - new Date(tx.due_date).getTime()) / 86400000);
      const title = "Overdue Book — Please Return Immediately";
      const body = `"${bookTitle}" was due on ${dueLabel} (${daysOver} day${daysOver !== 1 ? "s" : ""} ago). Fines are accumulating.`;

      let email = null;
      if (tx.users?.auth_id) {
        const { data: au } = await supabase.from("auth_users").select("email").eq("id", tx.users.auth_id).maybeSingle();
        email = au?.email || null;
      }

      let emailSent = false;
      if (email) {
        const r = await sendMail({ to: email, subject: `ShelfMaster — Overdue Book: "${bookTitle}"`, html: htmlEmail({ type: "overdue", heading: title, body: `<p>Hello ${firstName},</p><p>${body}</p>` }), text: body });
        emailSent = !!r.ok;
      }

      await supabase.from("notifications").insert({ id: uuidv4(), user_id: userId, type: "overdue", title, body, email_sent: emailSent, transaction_id: tx.id });
      sent++;
    }

    res.json({ ok: true, sent, skipped });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
