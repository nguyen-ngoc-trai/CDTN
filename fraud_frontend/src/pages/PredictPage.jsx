// src/pages/PredictPage.jsx
import { useState, useRef } from 'react';
import { predictionsApi } from '../services/api';

const V_FIELDS = Array.from({ length: 28 }, (_, i) => `v${i + 1}`);

function RiskMeter({ probability }) {
  const pct = Math.round(probability * 100);
  const color = pct >= 85 ? '#ff2244' : pct >= 60 ? 'var(--red)' : pct >= 30 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ position: 'relative', display: 'inline-block', width: 160, height: 160 }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="65" fill="none" stroke="var(--bg3)" strokeWidth="10" />
          <circle cx="80" cy="80" r="65" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${2 * Math.PI * 65}`}
            strokeDashoffset={`${2 * Math.PI * 65 * (1 - probability)}`}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '80px 80px', transition: 'stroke-dashoffset 1s ease, stroke 0.5s' }}
          />
          <text x="80" y="72" textAnchor="middle" fill={color} fontSize="28" fontFamily="IBM Plex Mono" fontWeight="500">{pct}%</text>
          <text x="80" y="94" textAnchor="middle" fill="var(--text2)" fontSize="11" fontFamily="IBM Plex Mono" letterSpacing="1">FRAUD PROB.</text>
        </svg>
      </div>
    </div>
  );
}

export default function PredictPage() {
  const [mode, setMode] = useState('single'); // single | upload
  const [form, setForm] = useState({ amount: '', time_seconds: '', ...Object.fromEntries(V_FIELDS.map(v => [v, ''])) });
  const [threshold, setThreshold] = useState(0.5);
  const [result, setResult] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleSingle = async (e) => {
    e.preventDefault(); setError(''); setLoading(true); setResult(null);
    try {
      const data = {
        amount: parseFloat(form.amount),
        time_seconds: form.time_seconds ? parseInt(form.time_seconds) : 0,
        ...Object.fromEntries(V_FIELDS.map(v => [v, parseFloat(form[v] || 0)])),
      };
      const res = await predictionsApi.predictSingle(data, threshold);
      setResult(res);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError(''); setLoading(true); setBatchResult(null);
    try {
      const res = await predictionsApi.uploadCsv(file, threshold);
      setBatchResult(res);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const riskClass = (level) => `risk-badge risk-${level}`;

  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 6 }}>ML PREDICTION</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>Dự đoán gian lận</h1>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'var(--bg2)', borderRadius: 5, border: '1px solid var(--border)', padding: 3, width: 'fit-content' }}>
        {[{ id: 'single', label: 'Nhập thủ công' }, { id: 'upload', label: 'Upload CSV' }].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{ padding: '6px 16px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
              background: mode === m.id ? 'var(--blue2)' : 'transparent',
              color: mode === m.id ? '#fff' : 'var(--text1)',
            }}>
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mode === 'single' ? '1.4fr 1fr' : '1fr', gap: 20 }}>
        {/* Left panel */}
        <div>
          {mode === 'single' ? (
            <div className="card">
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 20 }}>THÔNG TIN GIAO DỊCH</div>
              <form onSubmit={handleSingle}>
                {/* Main fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', letterSpacing: 1, marginBottom: 5 }}>AMOUNT *</label>
                    <input className="input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', letterSpacing: 1, marginBottom: 5 }}>TIME (giây)</label>
                    <input className="input" type="number" placeholder="0" value={form.time_seconds} onChange={e => setForm(f => ({ ...f, time_seconds: e.target.value }))} />
                  </div>
                </div>

                {/* V fields grid */}
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 1, marginBottom: 10 }}>PCA FEATURES (V1–V28)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16 }}>
                  {V_FIELDS.map(v => (
                    <div key={v}>
                      <label style={{ display: 'block', fontSize: 9, color: 'var(--text2)', fontFamily: 'var(--mono)', marginBottom: 3 }}>{v.toUpperCase()}</label>
                      <input className="input" type="number" step="any" placeholder="0"
                        style={{ padding: '5px 7px', fontSize: 12 }}
                        value={form[v]} onChange={e => setForm(f => ({ ...f, [v]: e.target.value }))} />
                    </div>
                  ))}
                </div>

                {/* Threshold */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', letterSpacing: 1 }}>THRESHOLD</label>
                    <span style={{ fontSize: 11, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{threshold.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" value={threshold}
                    onChange={e => setThreshold(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--blue)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--mono)', marginTop: 3 }}>
                    <span>0.0 (nhạy hơn)</span><span>1.0 (chặt hơn)</span>
                  </div>
                </div>

                {error && <div style={{ background: 'var(--red-bg)', border: '1px solid #5a1a2a', borderRadius: 4, padding: '8px 12px', color: 'var(--red)', fontSize: 12, marginBottom: 12, fontFamily: 'var(--mono)' }}>✗ {error}</div>}
                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Đang dự đoán...' : '◈ Chạy dự đoán'}
                </button>
              </form>
            </div>
          ) : (
            <div className="card">
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 20 }}>UPLOAD CSV BATCH</div>
              <div style={{ border: '2px dashed var(--border2)', borderRadius: 6, padding: '32px', textAlign: 'center', marginBottom: 16, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onClick={() => fileRef.current?.click()}>
                <div style={{ fontSize: 28, marginBottom: 10, color: 'var(--text2)' }}>↑</div>
                <div style={{ fontSize: 14, color: 'var(--text1)', marginBottom: 4 }}>Kéo thả hoặc click để chọn file</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>CSV · Credit Card Fraud Detection format</div>
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', letterSpacing: 1 }}>THRESHOLD</label>
                  <span style={{ fontSize: 11, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{threshold.toFixed(2)}</span>
                </div>
                <input type="range" min="0" max="1" step="0.01" value={threshold} onChange={e => setThreshold(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--blue)' }} />
              </div>

              {error && <div style={{ background: 'var(--red-bg)', border: '1px solid #5a1a2a', borderRadius: 4, padding: '8px 12px', color: 'var(--red)', fontSize: 12, marginBottom: 12, fontFamily: 'var(--mono)' }}>✗ {error}</div>}
              <button className="btn btn-primary" onClick={handleUpload} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Đang xử lý...' : '↑ Upload và dự đoán'}
              </button>

              {/* Batch result */}
              {batchResult && (
                <div style={{ marginTop: 20, padding: 16, background: 'var(--bg2)', borderRadius: 4, border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 12 }}>KẾT QUẢ BATCH</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                    {[
                      { label: 'Tổng', value: batchResult.total, color: 'var(--blue)' },
                      { label: 'Gian lận', value: batchResult.fraud_count, color: 'var(--red)' },
                      { label: 'Tỷ lệ', value: batchResult.fraud_rate + '%', color: 'var(--amber)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: 'center', padding: '10px 0' }}>
                        <div style={{ fontSize: 22, fontFamily: 'var(--mono)', fontWeight: 500, color }}>{value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--mono)', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', marginBottom: 6 }}>BATCH ID</div>
                  <div style={{ fontSize: 11, color: 'var(--text1)', fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>{batchResult.batch_id}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel - result */}
        {mode === 'single' && (
          <div>
            {result ? (
              <div className="card fade-in">
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 4 }}>KẾT QUẢ DỰ ĐOÁN</div>

                <RiskMeter probability={result.fraud_probability} />

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <span className={riskClass(result.risk_level)}>
                    {result.is_fraud ? '⚠ GIAN LẬN' : '✓ HỢP LỆ'} · {result.risk_level.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'XÁC SUẤT', value: (result.fraud_probability * 100).toFixed(2) + '%' },
                    { label: 'THRESHOLD', value: result.threshold_used },
                    { label: 'THỜI GIAN XỬ LÝ', value: result.processing_time_ms + 'ms' },
                    { label: 'KẾT LUẬN', value: result.is_fraud ? 'GIAN LẬN' : 'HỢP LỆ' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 4 }}>
                      <div style={{ fontSize: 9, color: 'var(--text2)', fontFamily: 'var(--mono)', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 14, fontFamily: 'var(--mono)', color: 'var(--text0)' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Feature importance */}
                {result.feature_importance && (
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 10 }}>TOP FEATURES</div>
                    {Object.entries(result.feature_importance).slice(0, 5).map(([feat, imp]) => (
                      <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 28, fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--mono)', flexShrink: 0 }}>{feat}</div>
                        <div style={{ flex: 1, height: 4, background: 'var(--bg3)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${imp * 100 / Object.values(result.feature_importance)[0] * 100}%`, background: 'var(--blue)', borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text1)', fontFamily: 'var(--mono)', width: 42, textAlign: 'right' }}>{(imp * 100).toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text2)', gap: 10 }}>
                <div style={{ fontSize: 32 }}>◈</div>
                <div style={{ fontSize: 13 }}>Nhập thông tin giao dịch và chạy dự đoán</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function riskClass(level) { return `risk-badge risk-${level}`; }
