import { getBaseURL } from './connectionManager';

const SESSION_KEY = 'shelfmaster-session';
// Refresh the token this many seconds before it actually expires.
const REFRESH_BUFFER_SECS = 60;

function buildUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  const base = getBaseURL();
  if (!base) return url;
  return base.replace(/\/$/, '') + url;
}

function getStoredSession() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredSession(session) {
  if (session) {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}

// Decode a JWT payload (no signature verification — client-side only).
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : 0;
  } catch {
    return 0;
  }
}

// True if the access_token is missing or will expire within REFRESH_BUFFER_SECS.
function isTokenStale(session) {
  if (!session?.access_token) return true;
  const exp = session.expires_at ?? getTokenExpiry(session.access_token);
  return exp > 0 && Date.now() / 1000 >= exp - REFRESH_BUFFER_SECS;
}

// Single in-flight refresh promise so concurrent requests don't all refresh at once.
let _refreshPromise = null;

async function refreshSession() {
  const session = getStoredSession();
  if (!session?.refresh_token) {
    setStoredSession(null);
    return null;
  }

  try {
    const response = await fetch(buildUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.access_token) {
      // Refresh failed — log the user out silently.
      setStoredSession(null);
      return null;
    }

    const newSession = {
      ...session,
      access_token:  data.access_token,
      refresh_token: data.refresh_token ?? session.refresh_token,
      expires_at:    data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : 0,
    };
    setStoredSession(newSession);
    return newSession;
  } catch {
    return null;
  }
}

// Ensure only one refresh happens at a time (deduplicates concurrent calls).
async function ensureFreshToken() {
  const session = getStoredSession();
  if (!isTokenStale(session)) return session;

  if (!_refreshPromise) {
    _refreshPromise = refreshSession().finally(() => { _refreshPromise = null; });
  }
  return _refreshPromise;
}

function getAuthHeader() {
  const session = getStoredSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function apiRequest(url, options = {}) {
  // Auto-refresh the token before any authenticated request.
  await ensureFreshToken();

  const response = await fetch(buildUrl(url), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { data: null, error: result.error ? { message: result.error } : result.error || { message: 'Request failed.' }, count: 0 };
  }

  return result;
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.action = 'select';
    this.selectValue = '*';
    this.filters = [];
    this.orderValue = null;
    this.limitValue = null;
    this.options = {};
    this.payload = null;
    this.returning = false;
    this.singleValue = false;
    this.maybeSingleValue = false;
  }

  select(value = '*', options = {}) {
    this.action = this.action === 'insert' || this.action === 'update' ? this.action : 'select';
    this.selectValue = value;
    this.options = options || {};
    this.returning = this.action === 'insert' || this.action === 'update';
    return this;
  }

  insert(payload) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  eq(column, value) {
    this.filters.push({ op: 'eq', column, value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ op: 'neq', column, value });
    return this;
  }

  gte(column, value) {
    this.filters.push({ op: 'gte', column, value });
    return this;
  }

  lt(column, value) {
    this.filters.push({ op: 'lt', column, value });
    return this;
  }

  in(column, value) {
    this.filters.push({ op: 'in', column, value });
    return this;
  }

  ilike(column, value) {
    this.filters.push({ op: 'ilike', column, value });
    return this;
  }

  order(column, options = {}) {
    this.orderValue = { column, ascending: options.ascending !== false };
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  single() {
    this.singleValue = true;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  maybeSingle() {
    this.maybeSingleValue = true;
    return this;
  }

  async execute() {
    return apiRequest('/api/db/query', {
      method: 'POST',
      body: JSON.stringify({
        action: this.action,
        table: this.table,
        select: this.selectValue,
        filters: this.filters,
        order: this.orderValue,
        limit: this.limitValue,
        options: this.options,
        payload: this.payload,
        returning: this.returning,
        single: this.singleValue,
        maybeSingle: this.maybeSingleValue,
      }),
    });
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.execute().catch(onRejected);
  }

  finally(onFinally) {
    return this.execute().finally(onFinally);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

export const localDb = {
  from(table) {
    return new QueryBuilder(table);
  },

  channel() {
    return {
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
    };
  },

  removeChannel() {},

  storage: {
    createBucket: async () => ({ data: null, error: null }),
    from: () => ({
      upload: async (filePath, file) => {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const result = await apiRequest('/api/storage/upload', {
            method: 'POST',
            body: JSON.stringify({ path: filePath, dataUrl }),
          });
          return result.error ? { data: null, error: result.error } : { data: result, error: null };
        } catch (error) {
          return { data: null, error: { message: error.message } };
        }
      },
      getPublicUrl: (filePath) => ({ data: { publicUrl: buildUrl(`/uploads/${filePath}`) } }),
    }),
  },

  auth: {
    getSession: async () => ({ data: { session: getStoredSession() }, error: null }),

    getUser: async () => {
      const session = getStoredSession();
      if (!session?.access_token) {
        return { data: { user: null }, error: null };
      }

      const result = await apiRequest('/api/auth/user');
      if (result.error) {
        setStoredSession(null);
        return { data: { user: null }, error: result.error };
      }

      return { data: { user: result.user }, error: null };
    },

    signInWithPassword: async ({ email, password }) => {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (result.error) {
        return { data: { user: null, session: null }, error: result.error };
      }

      // Persist the session, including expires_at so auto-refresh knows when to act.
      const session = {
        ...result.session,
        expires_at: result.session?.expires_in
          ? Math.floor(Date.now() / 1000) + result.session.expires_in
          : getTokenExpiry(result.session?.access_token ?? ''),
      };
      setStoredSession(session);
      return { data: { user: result.user, session }, error: null };
    },

    signUp: async ({ email, password }) => {
      const result = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (result.error) {
        return { data: { user: null, session: null }, error: result.error };
      }

      return {
        data: { user: result.user, session: null },
        error: null,
        verified: result.verified,
        isAdmin: result.isAdmin || false,
        mailer: result.mailer,
        verifyUrl: result.verifyUrl,
      };
    },

    verifyEmail: async () => {
      // Verification is handled by Supabase before the user lands on /verify.
      // The hash fragment (#access_token=...&type=signup) confirms success.
      return { ok: true };
    },

    resendVerification: async (email) => {
      return apiRequest('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    signOut: async () => {
      setStoredSession(null);
      return { error: null };
    },

    onAuthStateChange: () => ({
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    }),
  },
};