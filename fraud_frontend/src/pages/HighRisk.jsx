import { useEffect, useState } from 'react'
import { getHighRisk, exportHighRiskCSV } from '../lib/api'
import { useNotification } from '../context/NotificationContext'

export default function HighRiskPage() {
  const [data, setData]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState(null)   // { type: 'ok'|'err', text }
  const [minProb, setMinProb]     = useState(0)      // filter cho export
  const { markAllSeen } = useNotification()

  useEffect(() => {
    // Reset badge ngay khi trang này mở
    markAllSeen()
    getHighRisk(100)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  const handleExport = async () => {
    setExporting(true)
    setExportMsg(null)
    try {
      const total = await exportHighRiskCSV(500, minProb / 100)
      setExportMsg({ type: 'ok', text: `✓ Đã xuất ${total} giao dịch ra file CSV` })
    } catch (e) {
      setExportMsg({ type: 'err', text: '✕ Xuất file thất bại: ' + e.message })
    } finally {
      setExporting(false)
      setTimeout(() => setExportMsg(null), 5000)
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ color: 'var(--danger)' }}>⚠ Cảnh báo rủi ro cao</h1>
          <p className="page-subtitle">Các giao dịch có xác suất gian lận ≥ 80% — cần xem xét ngay</p>
        </div>

        {/* Export controls */}
        {data.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                Xác suất tối thiểu
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="range"
                  min={0}
                  max={99}
                  value={minProb}
                  onChange={e => setMinProb(Number(e.target.value))}
                  style={{ width: 90, accentColor: 'var(--danger)', cursor: 'pointer' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)', fontWeight: 700, minWidth: 36 }}>
                  {minProb}%
                </span>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 18px',
                background: exporting ? 'var(--bg-elevated)' : 'var(--danger)',
                color: exporting ? 'var(--text-muted)' : '#fff',
                border: '1px solid var(--danger)',
                borderRadius: 8,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 13,
                cursor: exporting ? 'not-allowed' : 'pointer',
                transition: 'all .2s',
                whiteSpace: 'nowrap',
              }}
            >
              {exporting
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span> Đang xuất…</>
                : <><span>↓</span> Xuất CSV</>}
            </button>
          </div>
        )}
      </div>

      {/* Feedback message */}
      {exportMsg && (
        <div
          className={exportMsg.type === 'ok' ? 'alert' : 'alert alert-error'}
          style={{ marginBottom: 16, background: exportMsg.type === 'ok' ? 'rgba(0,229,160,.1)' : undefined, borderColor: exportMsg.type === 'ok' ? 'var(--safe)' : undefined, color: exportMsg.type === 'ok' ? 'var(--safe)' : undefined }}
        >
          {exportMsg.text}
        </div>
      )}

      {loading ? (
        <div className="loading-state"><div className="spinner" />Đang tải...</div>
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <div style={{ color: 'var(--safe)', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Không có giao dịch rủi ro cao</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>Hệ thống hoạt động bình thường</div>
        </div>
      ) : (
        <>
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            🚨 Phát hiện <strong>{data.length}</strong> giao dịch cần chú ý
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.map(txn => {
              const prob = txn.prediction?.fraud_probability ?? 0
              const probPct = (prob * 100).toFixed(2)
              return (
                <div key={txn.id} className="card" style={{ borderColor: 'rgba(255,77,109,.35)', padding: '16px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px 140px 130px', alignItems: 'center', gap: 16 }}>
                    {/* ID */}
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ID</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>#{txn.id}</div>
                    </div>

                    {/* Amount & time */}
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>AMOUNT</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>
                        ${txn.amount?.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>T={txn.time_seconds?.toFixed(0)}s</div>
                    </div>

                    {/* Probability bar */}
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>XSAT GIAN LẬN</div>
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{ width: `${probPct}%`, height: '100%', background: 'var(--danger)', borderRadius: 4, transition: 'width .6s ease' }} />
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)', fontSize: 18 }}>{probPct}%</div>
                    </div>

                    {/* Risk badge */}
                    <div style={{ textAlign: 'center' }}>
                      <span className="badge badge-high" style={{ fontSize: 12, padding: '5px 14px' }}>● RỦI RO CAO</span>
                    </div>

                    {/* Model */}
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>MODEL</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {txn.prediction?.model_version || '—'}
                      </div>
                    </div>

                    {/* Date */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>NGÀY</div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {new Date(txn.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{txn.source}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
