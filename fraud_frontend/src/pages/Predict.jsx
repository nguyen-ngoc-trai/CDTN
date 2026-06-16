import { useState, useRef } from 'react'
import { predictSingle, predictBatch } from '../lib/api'

const EMPTY_FORM = Object.fromEntries([
  ['Time', ''], ['Amount', ''],
  ...Array.from({ length: 28 }, (_, i) => [`V${i + 1}`, '']),
])

const SAMPLE_FRAUD = {
  Time: 406, Amount: 149.62,
  V1: -1.359807, V2: -0.072781, V3: 2.536347,  V4: 1.378155,
  V5: -0.338321, V6: 0.462388,  V7: 0.239599,  V8: 0.098698,
  V9: 0.363787,  V10: 0.090794, V11: -0.551600, V12: -0.617801,
  V13: -0.991390, V14: -0.311169, V15: 1.468177, V16: -0.470401,
  V17: 0.207971, V18: 0.025791, V19: 0.403993, V20: 0.251412,
  V21: -0.018307, V22: 0.277838, V23: -0.110474, V24: 0.066928,
  V25: 0.128539,  V26: -0.189115, V27: 0.133558, V28: -0.021053,
}

function RiskGauge({ prob }) {
  const angle = prob * 180
  const color = prob >= 0.8 ? 'var(--danger)' : prob >= 0.5 ? 'var(--warning)' : prob >= 0.2 ? 'var(--low)' : 'var(--safe)'
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 120 70" width="180" height="105" style={{ overflow: 'visible' }}>
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="var(--border)" strokeWidth="8" strokeLinecap="round" />
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${prob * 157} 157`} style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s' }} />
        <g transform={`rotate(${-90 + angle}, 60, 60)`}>
          <line x1="60" y1="60" x2="60" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'all 0.6s ease' }} />
        </g>
        <circle cx="60" cy="60" r="4" fill={color} />
        <text x="60" y="80" textAnchor="middle" fill={color} fontSize="18" fontFamily="Syne" fontWeight="800">
          {(prob * 100).toFixed(1)}%
        </text>
      </svg>
    </div>
  )
}

function ResultCard({ result }) {
  if (!result) return null
  const riskClass = result.risk_level?.toLowerCase()
  const isFraud = result.is_fraud
  return (
    <div className={`card`} style={{ borderColor: isFraud ? 'rgba(255,77,109,.4)' : 'rgba(0,229,160,.3)', marginTop: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{isFraud ? '🚨' : '✅'}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: isFraud ? 'var(--danger)' : 'var(--safe)' }}>
            {isFraud ? 'GIAN LẬN' : 'BÌNH THƯỜNG'}
          </div>
          <span className={`badge badge-${riskClass}`} style={{ marginTop: 8 }}>
            {result.risk_level}
          </span>
        </div>
        <div>
          <RiskGauge prob={result.fraud_probability} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            Transaction #{result.transaction_id}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PredictPage() {
  const [tab, setTab]     = useState('single')
  const [form, setForm]   = useState(EMPTY_FORM)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [batchResult, setBatchResult] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchError, setBatchError]     = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const fillSample   = () => setForm(Object.fromEntries(Object.entries(SAMPLE_FRAUD).map(([k, v]) => [k, String(v)])))
  const clearForm    = () => { setForm(EMPTY_FORM); setResult(null); setError('') }

  const handleSubmit = async () => {
    setError(''); setResult(null); setLoading(true)
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, parseFloat(v)]))
      const res = await predictSingle(payload)
      setResult(res)
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Lỗi kết nối API. Đảm bảo backend đang chạy và đã activate model.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file || !file.name.endsWith('.csv')) { setBatchError('Chỉ chấp nhận file .csv'); return }
    setBatchError(''); setBatchResult(null); setBatchLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await predictBatch(fd)
      setBatchResult(res)
    } catch (e) {
      setBatchError(typeof e === 'string' ? e : 'Lỗi upload. Kiểm tra lại file CSV và model active.')
    } finally {
      setBatchLoading(false)
    }
  }

  const vCols = Array.from({ length: 28 }, (_, i) => `V${i + 1}`)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dự đoán gian lận</h1>
        <p className="page-subtitle">Nhập giao dịch thủ công hoặc upload CSV để phân tích hàng loạt</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-surface)', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid var(--border)' }}>
        {[['single', '⟁ Đơn lẻ'], ['batch', '⊞ Hàng loạt']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '6px 20px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, transition: 'all .15s',
              background: tab === id ? 'var(--accent)' : 'transparent',
              color: tab === id ? 'var(--bg-base)' : 'var(--text-secondary)' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'single' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Form */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 20 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Thông tin giao dịch</div>
              <div className="flex-gap">
                <button className="btn btn-outline btn-sm" onClick={fillSample}>Dữ liệu mẫu</button>
                <button className="btn btn-outline btn-sm" onClick={clearForm}>Xoá</button>
              </div>
            </div>

            <div className="form-grid-2">
              {['Time', 'Amount'].map(k => (
                <div className="form-group" key={k}>
                  <label className="form-label">{k}</label>
                  <input className="form-input" type="number" step="any" placeholder="0.0"
                    value={form[k]} onChange={e => handleChange(k, e.target.value)} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Features V1 – V28 (PCA)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {vCols.map(k => (
                  <div key={k}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>{k}</div>
                    <input className="form-input" type="number" step="any" placeholder="0"
                      style={{ padding: '5px 7px', fontSize: 11 }}
                      value={form[k]} onChange={e => handleChange(k, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="alert alert-error">⚠ {error}</div>}
            <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Đang phân tích...</> : '⟁ Phân tích giao dịch'}
            </button>
          </div>

          {/* Result panel */}
          <div>
            <div className="card" style={{ height: 'fit-content' }}>
              <div className="card-title">Kết quả dự đoán</div>
              {!result && !loading && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>⟁</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>Nhập thông tin giao dịch<br />và nhấn Phân tích</div>
                </div>
              )}
              {loading && <div className="loading-state"><div className="spinner" />Đang phân tích...</div>}
              {result && !loading && <ResultCard result={result} />}
            </div>
          </div>
        </div>
      )}

      {tab === 'batch' && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-title">Upload CSV hàng loạt</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
            File CSV phải có cột: <span className="mono">Time, Amount, V1–V28</span>. Cột <span className="mono">Class</span> là tuỳ chọn.
          </p>

          <div className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files[0]) }}>
            <div className="upload-icon">📂</div>
            <div className="upload-text">
              <strong>Kéo thả file CSV</strong> hoặc click để chọn<br />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hỗ trợ .csv — Mọi kích thước</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => handleFileUpload(e.target.files[0])} />

          {batchError && <div className="alert alert-error" style={{ marginTop: 16 }}>⚠ {batchError}</div>}

          {batchLoading && (
            <div className="loading-state" style={{ padding: 30 }}>
              <div className="spinner" />
              Đang xử lý file CSV...
            </div>
          )}

          {batchResult && !batchLoading && (
            <div style={{ marginTop: 20 }}>
              <div className="alert alert-success">✓ {batchResult.message}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  ['Tổng dòng',   batchResult.total_rows,    'var(--text-primary)'],
                  ['Đã xử lý',    batchResult.processed,     'var(--accent)'],
                  ['Gian lận',    batchResult.fraud_count,   'var(--danger)'],
                  ['Lỗi',         batchResult.errors,        'var(--warning)'],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 800, color }}>{val}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
