import { useEffect, useState } from 'react'
import { getTransactions } from '../lib/api'

const RISK_OPTS = ['', 'HIGH', 'MEDIUM', 'LOW', 'SAFE']

function Badge({ risk, fraud }) {
  if (risk) return <span className={`badge badge-${risk.toLowerCase()}`}>● {risk}</span>
  if (fraud !== undefined)
    return <span className={`badge ${fraud ? 'badge-fraud' : 'badge-normal'}`}>{fraud ? '✕ Gian lận' : '✓ Bình thường'}</span>
  return null
}

export default function TransactionsPage() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ is_fraud: '', risk_level: '', skip: 0, limit: 50 })
  const [selected, setSelected] = useState(null)

  const load = async (f = filters) => {
    setLoading(true)
    const params = {}
    if (f.is_fraud !== '')    params.is_fraud   = f.is_fraud === 'true'
    if (f.risk_level)         params.risk_level = f.risk_level
    params.skip  = f.skip
    params.limit = f.limit
    try {
      const res = await getTransactions(params)
      setData(res)
    } catch (_) {
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const setFilter = (k, v) => {
    const next = { ...filters, [k]: v, skip: 0 }
    setFilters(next); load(next)
  }
  const nextPage = () => {
    const next = { ...filters, skip: filters.skip + filters.limit }
    setFilters(next); load(next)
  }
  const prevPage = () => {
    const next = { ...filters, skip: Math.max(0, filters.skip - filters.limit) }
    setFilters(next); load(next)
  }

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Giao dịch</h1>
          <p className="page-subtitle">Lịch sử tất cả giao dịch đã được phân tích</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label" style={{ marginBottom: 4 }}>Loại</label>
            <select className="form-select" style={{ width: 140 }}
              value={filters.is_fraud} onChange={e => setFilter('is_fraud', e.target.value)}>
              <option value="">Tất cả</option>
              <option value="true">Gian lận</option>
              <option value="false">Bình thường</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ marginBottom: 4 }}>Mức rủi ro</label>
            <select className="form-select" style={{ width: 140 }}
              value={filters.risk_level} onChange={e => setFilter('risk_level', e.target.value)}>
              {RISK_OPTS.map(o => <option key={o} value={o}>{o || 'Tất cả'}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ marginBottom: 4 }}>Số dòng / trang</label>
            <select className="form-select" style={{ width: 100 }}
              value={filters.limit} onChange={e => setFilter('limit', parseInt(e.target.value))}>
              {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button className="btn btn-outline btn-sm" style={{ marginTop: 18 }} onClick={() => load()}>↻ Làm mới</button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-state"><div className="spinner" />Đang tải...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Thời gian</th>
                  <th>Số tiền</th>
                  <th>Xác suất GL</th>
                  <th>Mức rủi ro</th>
                  <th>Kết quả</th>
                  <th>Model</th>
                  <th>Nguồn</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    Không có dữ liệu. Hãy dự đoán một giao dịch trước.
                  </td></tr>
                ) : data.map(txn => (
                  <tr key={txn.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(txn === selected ? null : txn)}>
                    <td className="mono">#{txn.id}</td>
                    <td className="mono">{txn.time_seconds?.toFixed(0)}</td>
                    <td>${txn.amount?.toFixed(2)}</td>
                    <td>
                      {txn.prediction && (
                        <span className="prob-value" style={{ color: txn.prediction.is_fraud ? 'var(--danger)' : 'var(--safe)' }}>
                          {(txn.prediction.fraud_probability * 100).toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td>{txn.prediction && <Badge risk={txn.prediction.risk_level} />}</td>
                    <td>{txn.prediction && <Badge fraud={txn.prediction.is_fraud} />}</td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{txn.prediction?.model_version || '—'}</td>
                    <td><span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{txn.source}</span></td>
                    <td className="mono" style={{ fontSize: 11 }}>{new Date(txn.created_at).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail expand */}
        {selected && (
          <div style={{ borderTop: '1px solid var(--border)', padding: 20, background: 'var(--bg-elevated)' }}>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Chi tiết giao dịch #{selected.id}</span>
              <button className="btn btn-outline btn-sm" onClick={() => setSelected(null)}>✕ Đóng</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {Array.from({ length: 28 }, (_, i) => `v${i + 1}`).map(k => (
                <div key={k} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: 2 }}>
                    {selected[k]?.toFixed(4) ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="mono">Trang {Math.floor(filters.skip / filters.limit) + 1} · {data.length} dòng</span>
          <div className="flex-gap">
            <button className="btn btn-outline btn-sm" onClick={prevPage} disabled={filters.skip === 0}>← Trước</button>
            <button className="btn btn-outline btn-sm" onClick={nextPage} disabled={data.length < filters.limit}>Sau →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
