// src/pages/ModelsPage.jsx
import { useEffect, useState, useRef } from 'react';
import { modelsApi } from '../services/api';
import { useAuth } from '../store/AuthContext';

export default function ModelsPage() {
  const { isAdmin } = useAuth();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', algorithm: 'RandomForest', f1_score: '', precision_score: '', recall_score: '', roc_auc: '', threshold: '0.5' });
  const fileRef = useRef();
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    modelsApi.list().then(setModels).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleActivate = async (id) => {
    try {
      await modelsApi.activate(id);
      setMsg('Đã kích hoạt model thành công.');
      load();
    } catch (e) { setErr(e.message); }
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadForm.name) return;
    setUploading(true); setErr(''); setMsg('');
    try {
      await modelsApi.upload(file, { ...uploadForm });
      setMsg('Upload model thành công!');
      load();
    } catch (e) { setErr(e.message); }
    finally { setUploading(false); }
  };

  const fmtPct = (v) => v != null ? (v * 100).toFixed(1) + '%' : '—';
  const fmtDate = (s) => s ? new Date(s).toLocaleString('vi-VN') : '—';
  const ALGOS = ['RandomForest', 'IsolationForest', 'LogisticRegression', 'NeuralNetwork'];

  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 6 }}>ML MANAGEMENT</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>Quản lý mô hình</h1>
      </div>

      {msg && <div style={{ background: 'var(--green-bg)', border: '1px solid #1a5a3a', borderRadius: 4, padding: '8px 14px', color: 'var(--green)', fontSize: 12, fontFamily: 'var(--mono)', marginBottom: 16 }}>✓ {msg}</div>}
      {err && <div style={{ background: 'var(--red-bg)', border: '1px solid #5a1a2a', borderRadius: 4, padding: '8px 14px', color: 'var(--red)', fontSize: 12, fontFamily: 'var(--mono)', marginBottom: 16 }}>✗ {err}</div>}

      {/* Model list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2 }}>DANH SÁCH MODEL</div>
        <table className="table">
          <thead>
            <tr><th>Tên</th><th>Algorithm</th><th>F1</th><th>Precision</th><th>Recall</th><th>AUC</th><th>Threshold</th><th>Ngày tạo</th><th>Trạng thái</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text2)', padding: 24 }}>Đang tải...</td></tr>
            ) : models.map(m => (
              <tr key={m.id}>
                <td><span style={{ fontWeight: 500 }}>{m.name}</span></td>
                <td><span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--blue)' }}>{m.algorithm}</span></td>
                <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{fmtPct(m.f1_score)}</span></td>
                <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--blue)' }}>{fmtPct(m.precision_score)}</span></td>
                <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--amber)' }}>{fmtPct(m.recall_score)}</span></td>
                <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--text1)' }}>{fmtPct(m.roc_auc)}</span></td>
                <td><span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{m.threshold}</span></td>
                <td><span style={{ fontSize: 11, color: 'var(--text2)' }}>{fmtDate(m.created_at)}</span></td>
                <td>
                  {m.is_active ? (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>● ACTIVE</span>
                  ) : isAdmin ? (
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => handleActivate(m.id)}>Kích hoạt</button>
                  ) : (
                    <span style={{ color: 'var(--text2)', fontSize: 11 }}>Inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload section — admin only */}
      {isAdmin && (
        <div className="card">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 20 }}>UPLOAD MODEL MỚI</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', letterSpacing: 1, marginBottom: 5 }}>TÊN MODEL *</label>
              <input className="input" value={uploadForm.name} onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))} placeholder="RandomForest v2" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', letterSpacing: 1, marginBottom: 5 }}>ALGORITHM *</label>
              <select className="input" value={uploadForm.algorithm} onChange={e => setUploadForm(f => ({ ...f, algorithm: e.target.value }))}>
                {ALGOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {['f1_score', 'precision_score', 'recall_score', 'roc_auc', 'threshold'].map(field => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', letterSpacing: 1, marginBottom: 5 }}>{field.toUpperCase().replace('_', ' ')}</label>
                <input className="input" type="number" step="0.0001" min="0" max="1" value={uploadForm[field]} onChange={e => setUploadForm(f => ({ ...f, [field]: e.target.value }))} placeholder="0.0000" />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', letterSpacing: 1, marginBottom: 5 }}>FILE .PKL *</label>
            <input ref={fileRef} type="file" accept=".pkl" className="input" style={{ padding: '6px 12px', cursor: 'pointer' }} />
          </div>

          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Đang upload...' : '↑ Upload model'}
          </button>
        </div>
      )}
    </div>
  );
}
