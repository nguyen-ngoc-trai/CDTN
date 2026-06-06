// src/services/api.js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Lỗi không xác định' }));
    throw new ApiError(res.status, err.detail || 'Lỗi server');
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (username, password) => {
    const form = new URLSearchParams({ username, password });
    return request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
  },
  me: () => request('/auth/me'),
};

// ── Dashboard ─────────────────────────────────────────────────
export const reportsApi = {
  dashboard: () => request('/reports/dashboard'),
  timeseries: (days = 30) => request(`/reports/timeseries?days=${days}`),
  exportCsv: (isFraud) => {
    const token = localStorage.getItem('token');
    const url = `${BASE}/reports/export/csv${isFraud != null ? `?is_fraud=${isFraud}` : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fraud_transactions.csv';
    // Fetch with auth then download
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        a.href = URL.createObjectURL(blob);
        a.click();
      });
  },
};

// ── Transactions ──────────────────────────────────────────────
export const transactionsApi = {
  list: (page = 1, pageSize = 20) =>
    request(`/transactions?page=${page}&page_size=${pageSize}`),
  get: (id) => request(`/transactions/${id}`),
  create: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Predictions ───────────────────────────────────────────────
export const predictionsApi = {
  predictSingle: (data, threshold) =>
    request('/predictions/predict', {
      method: 'POST',
      body: JSON.stringify({ transaction: data, threshold }),
    }),
  uploadCsv: (file, threshold) => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);
    if (threshold != null) form.append('threshold', threshold);
    return fetch(`${BASE}/predictions/predict/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async r => {
      if (!r.ok) throw new ApiError(r.status, (await r.json()).detail);
      return r.json();
    });
  },
  list: (isFraud, riskLevel, page = 1) =>
    request(`/predictions/?${isFraud != null ? `is_fraud=${isFraud}&` : ''}${riskLevel ? `risk_level=${riskLevel}&` : ''}page=${page}`),
};

// ── Alerts ────────────────────────────────────────────────────
export const alertsApi = {
  list: (unreadOnly = false) => request(`/alerts/?unread_only=${unreadOnly}`),
  markRead: (id) => request(`/alerts/${id}/read`, { method: 'PUT' }),
  resolve: (id) => request(`/alerts/${id}/resolve`, { method: 'PUT' }),
};

// ── Models ────────────────────────────────────────────────────
export const modelsApi = {
  list: () => request('/models/'),
  active: () => request('/models/active'),
  activate: (id) => request(`/models/${id}/activate`, { method: 'PUT' }),
  upload: (file, meta) => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);
    Object.entries(meta).forEach(([k, v]) => v != null && form.append(k, v));
    return fetch(`${BASE}/models/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async r => {
      if (!r.ok) throw new ApiError(r.status, (await r.json()).detail);
      return r.json();
    });
  },
};
