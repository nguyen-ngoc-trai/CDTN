import { clsx } from 'clsx'

/* ── Card ──────────────────────────────────────────────────── */
export function Card({ children, style, className }) {
  return (
    <div className={className} style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '20px 24px',
      ...style,
    }}>
      {children}
    </div>
  )
}

/* ── Stat Card ─────────────────────────────────────────────── */
export function StatCard({ label, value, sub, accent, icon, delay = 0 }) {
  const color = accent === 'danger' ? 'var(--danger)'
              : accent === 'warning' ? 'var(--warning)'
              : accent === 'success' ? 'var(--success)'
              : 'var(--accent)'
  return (
    <div className={`fade-up fade-up-${delay}`} style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Accent stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 2, background: color, borderRadius: '10px 10px 0 0',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500 }}>
          {label}
        </span>
        {icon && <span style={{ fontSize: 20, color, opacity: 0.7 }}>{icon}</span>}
      </div>
      <div style={{
        fontSize: 32,
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        color,
        lineHeight: 1,
        letterSpacing: '-1px',
      }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

/* ── Badge ──────────────────────────────────────────────────── */
export function Badge({ level }) {
  const map = {
    low:      { bg: '#2ed57320', color: '#2ed573', label: 'Thấp' },
    medium:   { bg: '#ffa50220', color: '#ffa502', label: 'Trung bình' },
    high:     { bg: '#ff475720', color: '#ff4757', label: 'Cao' },
    critical: { bg: '#ff003320', color: '#ff0033', label: 'Nguy hiểm' },
    true:     { bg: '#ff475720', color: '#ff4757', label: 'Gian lận' },
    false:    { bg: '#2ed57320', color: '#2ed573', label: 'Hợp lệ' },
  }
  const cfg = map[String(level)] || { bg: '#8899aa20', color: '#8899aa', label: String(level) }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: 11.5,
      fontWeight: 500,
      background: cfg.bg,
      color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

/* ── Button ─────────────────────────────────────────────────── */
export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: 7, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s', border: '1px solid transparent',
    opacity: disabled ? 0.5 : 1,
    fontSize: size === 'sm' ? 12 : 13.5,
    padding: size === 'sm' ? '5px 12px' : '8px 18px',
    ...style,
  }
  const variants = {
    primary:  { background: 'var(--accent)',   color: '#080b0f',          border: 'none' },
    danger:   { background: 'var(--danger-dim)', color: 'var(--danger)',  borderColor: 'var(--danger)' },
    ghost:    { background: 'transparent',     color: 'var(--text-secondary)', borderColor: 'var(--border)' },
    outline:  { background: 'transparent',     color: 'var(--accent)',    borderColor: 'var(--accent)' },
  }
  return (
    <button disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  )
}

/* ── Table ──────────────────────────────────────────────────── */
export function Table({ columns, data, onRowClick }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{
                textAlign: col.align || 'left',
                padding: '10px 14px',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.7px',
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border)',
                whiteSpace: 'nowrap',
              }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>
                Không có dữ liệu
              </td>
            </tr>
          ) : data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: '1px solid var(--border)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map((col) => (
                <td key={col.key} style={{
                  padding: '11px 14px',
                  fontSize: 13,
                  textAlign: col.align || 'left',
                  color: col.dim ? 'var(--text-secondary)' : 'var(--text-primary)',
                  fontFamily: col.mono ? 'var(--font-mono)' : 'inherit',
                  whiteSpace: col.nowrap ? 'nowrap' : 'normal',
                }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Spinner ─────────────────────────────────────────────────── */
export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid var(--border)`,
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

/* ── PageHeader ──────────────────────────────────────────────── */
export function PageHeader({ title, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px' }}>
        {title}
      </h2>
      {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
    </div>
  )
}
