// src/pages/AlertsPage.jsx
import { useEffect, useState } from 'react';
import { alertsApi } from '../services/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    alertsApi.list(unreadOnly).then(setAlerts).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [unreadOnly]);

  const markRead = async (id) => {
    await alertsApi.markRead(id);
    setAlerts(a => a.map(x => x.id === id ? { ...x, is_read: true } : x));
  };

  const resolve = async (id) => {
    await alertsApi.resolve(id);
    setAlerts(a => a.map(x => x.id === id ? { ...x, is_resolved: true, is_read: true } : x));
  };

  const typeColor = { high_risk: 'var(--amber)', critical_risk: 'var(--red)', model_error: 'var(--text2)' };
  const fmtDate = (s) => s ? new Date(s).toLocaleString('vi-VN') : '—';

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 6 }}>MONITORING</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>Cảnh báo</h1>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text1)' }}>
          <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} style={{ accentColor: 'var(--blue)' }} />
          Chỉ chưa đọc
        </label>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12 }}>LOADING...</div>
      ) : alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text2)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◉</div>
          <div>Không có cảnh báo nào</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map(alert => (
            <div key={alert.id} className="card fade-in" style={{
              borderLeft: `3px solid ${typeColor[alert.alert_type] || 'var(--border)'}`,
              opacity: alert.is_resolved ? 0.5 : 1,
              padding: '14px 18px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: typeColor[alert.alert_type], letterSpacing: 0.5 }}>
                      {alert.alert_type.replace('_', ' ').toUpperCase()}
                    </span>
                    {!alert.is_read && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block' }} />
                    )}
                    {alert.is_resolved && (
                      <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--mono)' }}>✓ RESOLVED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text0)', marginBottom: 8 }}>{alert.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{fmtDate(alert.created_at)}</div>
                </div>
                {!alert.is_resolved && (
                  <div style={{ display: 'flex', gap: 8, marginLeft: 16, flexShrink: 0 }}>
                    {!alert.is_read && (
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => markRead(alert.id)}>Đọc</button>
                    )}
                    <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => resolve(alert.id)}>Xử lý</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
