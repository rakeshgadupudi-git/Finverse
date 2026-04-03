// Centralised API config
export const API_BASE = '/api';

export const endpoints = {
  livePrice: (ticker) => `${API_BASE}/live-price?ticker=${ticker}`,
  livePrices: (tickers) => `${API_BASE}/live-price?tickers=${tickers}`,
  marketNews: `${API_BASE}/news?type=market`,
  stockNews: (ticker) => `${API_BASE}/news?ticker=${ticker}`,
  finChatStream: `${API_BASE}/finchat/stream`,
  stocksSearch: (query) => `${API_BASE}/stocks?q=${query}`
};

// ── Auth API ────────────────────────────────────────────────────────────────

const authPost = async (path, body) => {
  const res = await fetch(`${API_BASE}/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};

export const authApi = {
  register: (name, email, password, confirmPassword) =>
    authPost('/register', { name, email, password, confirmPassword }),

  verifyEmail: (userId, otp) =>
    authPost('/verify-email', { userId, otp }),

  login: (email, password) =>
    authPost('/login', { email, password }),
};

// ── Authenticated fetch with automatic token refresh ────────────────────────

const authFetch = async (url, method = 'GET', body = null) => {
  const buildOpts = (token) => {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    };
    if (body) opts.body = JSON.stringify(body);
    return opts;
  };

  let token = localStorage.getItem('fintracker_access_token');
  let res = await fetch(url, buildOpts(token));

  // Token expired — try silent refresh once
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('fintracker_refresh_token');
    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        token = refreshData.data.accessToken;
        localStorage.setItem('fintracker_access_token', token);
        res = await fetch(url, buildOpts(token)); // retry with new token
      } else {
        // Refresh also failed — force re-login
        localStorage.removeItem('fintracker_access_token');
        localStorage.removeItem('fintracker_refresh_token');
        window.location.reload();
        throw new Error('Session expired. Please log in again.');
      }
    } else {
      localStorage.removeItem('fintracker_access_token');
      window.location.reload();
      throw new Error('Session expired. Please log in again.');
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};

const userFetch  = (path, method, body) => authFetch(`${API_BASE}/user${path}`, method, body);
const txFetch    = (path, method, body) => authFetch(`${API_BASE}/transactions${path}`, method, body);

// ── User API ────────────────────────────────────────────────────────────────

export const userApi = {
  getMe:          ()                             => userFetch('/me'),
  updateMe:       (name)                         => userFetch('/me', 'PATCH', { name }),
  changePassword: (currentPassword, newPassword) => userFetch('/change-password', 'PATCH', { currentPassword, newPassword }),
  deleteMe:       ()                             => userFetch('/me', 'DELETE'),
};

// ── Transaction API ─────────────────────────────────────────────────────────

// Normalise a backend transaction → frontend shape
export const normalizeTx = (t) => ({
  id: t._id || t.id,
  description: t.description || '',
  amount: t.amount,
  category: t.category || 'Uncategorized',
  type: (t.type || 'expense').toLowerCase(),
  date: t.date ? new Date(t.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
});

export const transactionApi = {
  getAll: ()      => txFetch(''),
  add:    (body)  => txFetch('', 'POST', body),
  remove: (id)    => txFetch(`/${id}`, 'DELETE'),
};
