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

  resendOtp: (userId, type) =>
    authPost('/resend-otp', { userId, type }),

  forgotPassword: (email) =>
    authPost('/forgot-password', { email }),

  resetPassword: (userId, otp, newPassword) =>
    authPost('/reset-password', { userId, otp, newPassword }),
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
  update: (id, body) => txFetch(`/${id}`, 'PATCH', body),
  remove: (id)    => txFetch(`/${id}`, 'DELETE'),
};

// ── Tax API ──────────────────────────────────────────────────────────────────

export const taxApi = {
  calculate: (payload) => authFetch(`${API_BASE}/tax/calculate`, 'POST', payload),
  gst:       (payload) => fetch(`${API_BASE}/tax/gst`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((r) => r.json()),
};

// ── Goals API ────────────────────────────────────────────────────────────────

const goalFetch = (path, method, body) => authFetch(`${API_BASE}/goals${path}`, method, body);

export const goalApi = {
  getAll:  ()           => goalFetch(''),
  create:  (body)       => goalFetch('', 'POST', body),
  update:  (id, body)   => goalFetch(`/${id}`, 'PATCH', body),
  remove:  (id)         => goalFetch(`/${id}`, 'DELETE'),
};

// ── Bills API ────────────────────────────────────────────────────────────────

const billFetch = (path, method, body) => authFetch(`${API_BASE}/bills${path}`, method, body);

export const billApi = {
  getAll:  ()         => billFetch(''),
  create:  (body)     => billFetch('', 'POST', body),
  update:  (id, body) => billFetch(`/${id}`, 'PATCH', body),
  remove:  (id)       => billFetch(`/${id}`, 'DELETE'),
};

// ── Notifications API ────────────────────────────────────────────────────────

const notifFetch = (path, method, body) => authFetch(`${API_BASE}/notifications${path}`, method, body);

export const notificationApi = {
  getAll:     ()   => notifFetch(''),
  markRead:   (id) => notifFetch(`/${id}`, 'PATCH'),
  markAllRead: ()  => notifFetch('/mark-all-read', 'PATCH'),
};

// ── Planned Payments API ─────────────────────────────────────────────────────

const ppFetch = (path, method, body) => authFetch(`${API_BASE}/planned-payments${path}`, method, body);

export const plannedPaymentApi = {
  getAll: (params) => ppFetch(params ? `?${params}` : ''),
  create: (body)   => ppFetch('', 'POST', body),
  update: (id, b)  => ppFetch(`/${id}`, 'PATCH', b),
  pay:    (id, b)  => ppFetch(`/${id}/pay`, 'POST', b),
  remove: (id)     => ppFetch(`/${id}`, 'DELETE'),
};

// ── Shopping Lists API ───────────────────────────────────────────────────────

const slFetch = (path, method, body) => authFetch(`${API_BASE}/shopping-lists${path}`, method, body);

export const shoppingListApi = {
  getLists:   ()               => slFetch(''),
  createList: (body)           => slFetch('', 'POST', body),
  updateList: (id, body)       => slFetch(`/${id}`, 'PATCH', body),
  deleteList: (id)             => slFetch(`/${id}`, 'DELETE'),
  addItem:    (listId, body)   => slFetch(`/${listId}/items`, 'POST', body),
  updateItem: (lId, iId, body) => slFetch(`/${lId}/items/${iId}`, 'PATCH', body),
  removeItem: (lId, iId)       => slFetch(`/${lId}/items/${iId}`, 'DELETE'),
  convert:    (listId, body)   => slFetch(`/${listId}/convert`, 'POST', body),
};

// ── Warranties API ───────────────────────────────────────────────────────────

const wFetch = (path, method, body) => authFetch(`${API_BASE}/warranties${path}`, method, body);

export const warrantyApi = {
  getAll:  ()         => wFetch(''),
  create:  (body)     => wFetch('', 'POST', body),
  update:  (id, body) => wFetch(`/${id}`, 'PATCH', body),
  remove:  (id)       => wFetch(`/${id}`, 'DELETE'),
};

// ── Loyalty Cards API ────────────────────────────────────────────────────────

const lcFetch = (path, method, body) => authFetch(`${API_BASE}/loyalty-cards${path}`, method, body);

export const loyaltyCardApi = {
  getAll:  ()         => lcFetch(''),
  create:  (body)     => lcFetch('', 'POST', body),
  update:  (id, body) => lcFetch(`/${id}`, 'PATCH', body),
  remove:  (id)       => lcFetch(`/${id}`, 'DELETE'),
};

// ── Debts API ────────────────────────────────────────────────────────────────

const debtFetch = (path, method, body) => authFetch(`${API_BASE}/debts${path}`, method, body);

export const debtApi = {
  getAll:        (params)        => debtFetch(params ? `?${params}` : ''),
  create:        (body)          => debtFetch('', 'POST', body),
  update:        (id, body)      => debtFetch(`/${id}`, 'PATCH', body),
  addPayment:    (id, body)      => debtFetch(`/${id}/payments`, 'POST', body),
  deletePayment: (id, paymentId) => debtFetch(`/${id}/payments/${paymentId}`, 'DELETE'),
  remove:        (id)            => debtFetch(`/${id}`, 'DELETE'),
};

// ── Accounts API ─────────────────────────────────────────────────────────────

const accFetch = (path, method, body) => authFetch(`${API_BASE}/accounts${path}`, method, body);

export const accountApi = {
  getAll:  ()         => accFetch(''),
  create:  (body)     => accFetch('', 'POST', body),
  update:  (id, body) => accFetch(`/${id}`, 'PATCH', body),
  remove:  (id)       => accFetch(`/${id}`, 'DELETE'),
};
