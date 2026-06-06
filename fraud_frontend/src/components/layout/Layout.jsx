// src/components/layout/Layout.jsx
import { useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { alertsApi } from '../../services/api';
import { useEffect } from 'react';

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',    icon: '▦' },
  { id: 'predict',      label: 'Dự đoán',      icon: '◈' },
  { id: 'transactions', label: 'Giao dịch',    icon: '≡' },
  { id: 'alerts',       label: 'Cảnh báo',     icon: '◉' },
  { id: 'models',       label: 'Mô hình ML',   icon: '⬡' },
];

export default function Layout({ children, currentPage, onNavigate }) {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    alertsApi.list(true).then(a => setUnread(a.length)).catch(() => {});
    const t = setInterval(() => {
      alertsApi.list(true).then(a => setUnread(a.length)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--bg1)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', letterSpacing: 2, marginBottom: 4 }}>SYSTEM</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text0)', letterSpacing: 0.5 }}>FraudGuard</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--blue)', marginTop: 3 }}>v1.0 · ONLINE</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV.map(item => {
            const active = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 20px',
                  background: active ? 'var(--blue-bg)' : 'transparent',
                  border: 'none', borderLeft: `2px solid ${active ? 'var(--blue)' : 'transparent'}`,
                  color: active ? 'var(--blue)' : 'var(--text1)',
                  fontSize: 13, fontWeight: active ? 500 : 400,
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                  position: 'relative',
                }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.id === 'alerts' && unread > 0 && (
                  <span style={{
                    marginLeft: 'auto', background: 'var(--red)', color: '#fff',
                    borderRadius: 10, fontSize: 10, fontFamily: 'var(--mono)',
                    padding: '1px 6px', minWidth: 18, textAlign: 'center',
                  }}>{unread}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)', marginBottom: 4 }}>LOGGED IN AS</div>
          <div style={{ fontSize: 13, color: 'var(--text0)', fontWeight: 500, marginBottom: 2 }}>{user?.username}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>{user?.role?.toUpperCase()}</div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '6px' }} onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg0)' }}>
        {children}
      </main>
    </div>
  );
}
