import { useEffect, useState, useRef } from 'react'
import { getModels, uploadModel, activateModel, deleteModel } from '../lib/api'

const ALGORITHMS = ['RandomForest', 'LogisticRegression', 'IsolationForest', 'NeuralNetwork', 'Other']

function AlgorithmIcon({ alg }) {
  const map = { RandomForest: '🌲', LogisticRegression: '📈', IsolationForest: '🔍', NeuralNetwork: '🧠', Other: '⚙' }
  return <span style={{ fontSize: 28 }}>{map[alg] || '⚙'}</span>
}

export default function ModelsPage({ onModelChange }) {
  const [models, setModels]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activating, setActivating] = useState(null)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ name: '', algorithm: 'RandomForest', description: '' })
  const fileRef = useRef()

  const load = () => {
    setLoading(true)
    getModels().then(setModels).catch(() => setModels([])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const notify = (msg, isErr = false) => {
    if (isErr) { setError(msg); setSuccess('') }
    else       { setSuccess(msg); setError('') }
    setTimeout(() => { setError(''); setSuccess('') }, 4000)
  }

  const handleUpload = async () => {
    const file = fileRef.current?.files[0]
    if (!file) return notify('Chọn file .pkl trước.', true)
    if (!form.name.trim()) return notify('Nhập tên model.', true)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', form.name.trim())
      fd.append('algorithm', form.algorithm)
      fd.append('description', form.description)
      await uploadModel(fd)
      notify(`Upload "${form.name}" thành công!`)
      setForm({ name: '', algorithm: 'RandomForest', description: '' })
      fileRef.current.value = ''
      setShowForm(false)
      load()
    } catch (e) {
      notify(typeof e === 'string' ? e : 'Upload thất bại.', true)
    } finally {
      setUploading(false)
    }
  }

  const handleActivate = async (id, name) => {
    setActivating(id)
    try {
      await activateModel(id)
      notify(`Đã kích hoạt "${name}"`)
      load()
      onModelChange?.()
    } catch (e) {
      notify(typeof e === 'string' ? e : 'Kích hoạt thất bại.', true)
    } finally {
      setActivating(null)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Xoá model "${name}"? Hành động này không thể hoàn tác.`)) return
    try {
      await deleteModel(id)
      notify(`Đã xoá "${name}"`)
      load()
    } catch (e) {
      notify(typeof e === 'string' ? e : 'Xoá thất bại.', true)
    }
  }

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Quản lý Model</h1>
          <p className="page-subtitle">Upload, kích hoạt và quản lý các model ML — chỉ 1 model active tại một thời điểm</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Huỷ' : '+ Upload model mới'}
        </button>
      </div>

      {error   && <div className="alert alert-error">⚠ {error}</div>}
      {success && <div className="alert alert-success">✓ {success}</div>}

      {/* Upload form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(0,212,255,.3)' }}>
          <div className="card-title">Upload model mới</div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Tên hiển thị *</label>
              <input className="form-input" placeholder="VD: Random Forest v3 (SMOTE)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Thuật toán *</label>
              <select className="form-select" value={form.algorithm} onChange={e => setForm(f => ({ ...f, algorithm: e.target.value }))}>
                {ALGORITHMS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả (tuỳ chọn)</label>
            <input className="form-input" placeholder="VD: Trained với SMOTE + GridSearch, F1=0.89" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">File model (.pkl) *</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input ref={fileRef} type="file" accept=".pkl"
                style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius)', padding: '7px 12px', color: 'var(--text-primary)', fontSize: 13 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Bundle phải có đủ 3 key: <span className="mono">model</span>, <span className="mono">scaler_amount</span>, <span className="mono">scaler_time</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? <><span className="spinner" style={{ width: 14, height: 14 }} />Đang upload...</> : '↑ Upload & Lưu'}
          </button>
        </div>
      )}

      {/* Model cards */}
      {loading ? (
        <div className="loading-state"><div className="spinner" />Đang tải...</div>
      ) : models.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>◉</div>
          <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Chưa có model nào</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>Upload file .pkl từ notebook Tuần 5 để bắt đầu.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {models.map(m => (
            <div key={m.id} className="card" style={{
              borderColor: m.is_active ? 'rgba(0,229,160,.5)' : 'var(--border)',
              position: 'relative', overflow: 'hidden',
              transition: 'border-color .2s',
            }}>
              {m.is_active && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--safe)' }} />
              )}

              <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, background: m.is_active ? 'var(--safe-dim)' : 'var(--bg-elevated)', border: `1px solid ${m.is_active ? 'rgba(0,229,160,.3)' : 'var(--border)'}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlgorithmIcon alg={m.algorithm} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{m.algorithm}</div>
                  {m.is_active && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 10, color: 'var(--safe)', fontFamily: 'var(--font-mono)', background: 'var(--safe-dim)', padding: '2px 8px', borderRadius: 20 }}>
                      <span style={{ width: 5, height: 5, background: 'var(--safe)', borderRadius: '50%', animation: 'pulse-dot 2s infinite' }} />
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {m.description && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                  {m.description}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>FILE</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{m.filename}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>UPLOADED</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {new Date(m.uploaded_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {!m.is_active && (
                  <button className="btn btn-success btn-sm" style={{ flex: 1 }}
                    onClick={() => handleActivate(m.id, m.name)}
                    disabled={activating === m.id}>
                    {activating === m.id ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Đang kích hoạt...</> : '▶ Kích hoạt'}
                  </button>
                )}
                {m.is_active && (
                  <div style={{ flex: 1, textAlign: 'center', padding: '5px', fontSize: 12, color: 'var(--safe)', fontFamily: 'var(--font-mono)' }}>
                    ✓ Đang sử dụng
                  </div>
                )}
                {!m.is_active && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id, m.name)}>
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
