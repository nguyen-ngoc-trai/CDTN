import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

// Gắn JWT token vào mỗi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Xử lý lỗi global
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || 'Đã có lỗi xảy ra'
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    } else if (err.response?.status !== 404) {
      toast.error(msg)
    }
    return Promise.reject(err)
  }
)

// ── Auth ───────────────────────────────────────────────────
export const authApi = {
  login: (username, password) => {
    const form = new FormData()
    form.append('username', username)
    form.append('password', password)
    return api.post('/auth/login', form)
  },
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

// ── Transactions ───────────────────────────────────────────
export const transactionApi = {
  list: (params) => api.get('/transactions', { params }),
  get: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
}

// ── Predictions ────────────────────────────────────────────
export const predictionApi = {
  predict: (body) => api.post('/predictions/predict', body),
  uploadCSV: (file, threshold) => {
    const form = new FormData()
    form.append('file', file)
    if (threshold) form.append('threshold', threshold)
    return api.post('/predictions/predict/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: (params) => api.get('/predictions', { params }),
}

// ── Reports ────────────────────────────────────────────────
export const reportApi = {
  dashboard: () => api.get('/reports/dashboard'),
  timeseries: (days) => api.get('/reports/timeseries', { params: { days } }),
  exportCsv: (isFraud) =>
    api.get('/reports/export/csv', {
      params: isFraud !== undefined ? { is_fraud: isFraud } : {},
      responseType: 'blob',
    }),
}

// ── Alerts ─────────────────────────────────────────────────
export const alertApi = {
  list: (params) => api.get('/alerts', { params }),
  markRead: (id) => api.put(`/alerts/${id}/read`),
  resolve: (id) => api.put(`/alerts/${id}/resolve`),
}

// ── ML Models ──────────────────────────────────────────────
export const modelApi = {
  list: () => api.get('/models'),
  active: () => api.get('/models/active'),
  upload: (form) => api.post('/models/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  activate: (id) => api.put(`/models/${id}/activate`),
}

export default api
