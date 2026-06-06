import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/',             icon: '◈', label: 'Dashboard'     },
  { to: '/transactions', icon: '⊞', label: 'Giao dịch'     },
  { to: '/predict',      icon: '⟐', label: 'Dự đoán'       },
  { to: '/alerts',       icon: '◉', label: 'Cảnh báo'      },
  { to: '/models',       icon: '⬡', label: 'Mô hình ML'    },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <aside style={{
      gridColumn: '1',
      gridRow: '1 / -1',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{
        height: 'var(--header-h)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid var(--border)',
        gap: 10,
      }}>
        <div style={{
          width: 28, height: 28,
          background: 'var(--accent)',
          borderRadius: 6,
          display: 'grid',
          placeItems: 'center',
          fontSize: 14,
          color: '#080b0f',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
        }}>F</div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: '-0.3px',
        }}>FraudGuard</span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '9px 20px',
              margin: '0 8px',
              borderRadius: 8,
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              fontWeight: isActive ? 500 : 400,
              fontSize: 13.5,
              transition: 'all 0.15s',
              textDecoration: 'none',
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.style.background.includes('accent-dim'))
                e.currentTarget.style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.style.background.includes('accent-dim'))
                e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: '50%',
          background: 'var(--bg-overlay)',
          border: '1px solid var(--border-bright)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 12,
          color: 'var(--accent)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          flexShrink: 0,
        }}>
          {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.username || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {user?.role || '—'}
          </div>
        </div>
        <button
          onClick={logout}
          title="Đăng xuất"
          style={{
            color: 'var(--text-muted)',
            fontSize: 16,
            padding: '4px',
            borderRadius: 4,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >⏻</button>
      </div>
    </aside>
  )
}
