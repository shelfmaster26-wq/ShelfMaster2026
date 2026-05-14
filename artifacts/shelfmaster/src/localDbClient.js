import { getBaseURL } from './connectionManager';

const SESSION_KEY = 'shelfmaster-session';

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

function getAuthHeader() {
  const session = getStoredSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function apiRequest(url, options = {}) {
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

      setStoredSession(result.session);
      return { data: { user: result.user, session: result.session }, error: null };
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

    verifyEmail: async (token) => {
      return apiRequest('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
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