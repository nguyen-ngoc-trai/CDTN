import { useLocation } from 'react-router-dom'

const titles = {
  '/':             { label: 'Dashboard',   sub: 'Tổng quan hệ thống' },
  '/transactions': { label: 'Giao dịch',   sub: 'Quản lý & lịch sử' },
  '/predict':      { label: 'Dự đoán',     sub: 'Phát hiện gian lận' },
  '/alerts':       { label: 'Cảnh báo',    sub: 'Giao dịch nghi ngờ' },
  '/models':       { label: 'Mô hình ML',  sub: 'Quản lý model' },
}

export default function Header() {
  const { pathname } = useLocation()
  const { label, sub } = titles[pathname] || { label: '', sub: '' }
  const now = new Date().toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <header style={{
      gridColumn: '2',
      gridRow: '1',
      height: 'var(--header-h)',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      zIndex: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '-0.3px',
          color: 'var(--text-primary)',
        }}>{label}</h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'inline-block',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }} />
          LIVE
        </div>
        <span style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>{now}</span>
      </div>
    </header>
  )
}
