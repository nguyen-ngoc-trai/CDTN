import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

// Đính kèm token vào mỗi request nếu có
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('fs_auth')
  if (stored) {
    try {
      const { token } = JSON.parse(stored)
      if (token) config.headers['Authorization'] = `Bearer ${token}`
    } catch {}
  }
  return config
})

api.interceptors.response.use(
  (r) => r.data,
  (err) => Promise.reject(err.response?.data?.detail || err.message)
)

// ── Auth ───────────────────────────────────────────────────────────────────
export const loginApi = (username, password) =>
  api.post('/auth/login', { username, password })

// ── Dashboard ──────────────────────────────────────────────────────────────
export const getDashboardStats    = ()         => api.get('/analytics/dashboard')
export const getTimeSeries        = ()         => api.get('/analytics/timeseries')
export const getFeatureImportance = ()         => api.get('/analytics/feature-importance')

// ── Transactions ───────────────────────────────────────────────────────────
export const getTransactions = (params) => api.get('/transactions/', { params })
export const getTransaction  = (id)     => api.get(`/transactions/${id}`)
export const getHighRisk     = (limit=20) => api.get('/transactions/high-risk/list', { params: { limit } })
export const getHighRiskCount = (sinceId=0) => api.get('/transactions/high-risk/count', { params: { since_id: sinceId } })

// ── Predict ────────────────────────────────────────────────────────────────
export const predictSingle = (payload)  => api.post('/predict/single', payload)
export const predictBatch  = (formData) => api.post('/predict/batch', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})

// ── ML Models ──────────────────────────────────────────────────────────────
export const getModels     = ()    => api.get('/models/')
export const getActiveModel= ()    => api.get('/models/active')
export const uploadModel   = (fd)  => api.post('/models/upload', fd, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const activateModel = (id)  => api.post(`/models/${id}/activate`)
export const deleteModel   = (id)  => api.delete(`/models/${id}`)

// ── Export ─────────────────────────────────────────────────────────────────
export const exportHighRiskCSV = async (limit = 500, minProb = 0) => {
  const stored = localStorage.getItem('fs_auth')
  const token = stored ? JSON.parse(stored).token : null
  const params = new URLSearchParams({ limit, min_prob: minProb })
  const res = await fetch(`/api/v1/transactions/high-risk/export?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Xuất file thất bại')
  const total = res.headers.get('X-Total-Records') || '?'
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const cd = res.headers.get('Content-Disposition') || ''
  const match = cd.match(/filename="(.+)"/)
  a.download = match ? match[1] : `high_risk_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  return Number(total)
}
