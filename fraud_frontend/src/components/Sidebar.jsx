import { useEffect, useState } from 'react'
import { getActiveModel } from '../lib/api'
import { useNotification } from '../context/NotificationContext'

const NAV_ALL = [
  { id: 'dashboard',    icon: '◈', label: 'Dashboard' },
  { id: 'predict',      icon: '⟁', label: 'Dự đoán',       customerOnly: true },
  { id: 'transactions', icon: '≡', label: 'Giao dịch' },
  { id: 'high-risk',    icon: '⚠', label: 'Rủi ro cao',    badge: true },
  { id: 'models',       icon: '◉', label: 'Quản lý Model',  adminOnly: true },
]

export default function Sidebar({ page, setPage, role, username, onLogout }) {
  const [activeModel, setActiveModel] = useState(null)
  const { badgeCount, markAllSeen } = useNotification()

  const isAdmin = role === 'admin'
  const NAV = NAV_ALL.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    if (item.customerOnly && isAdmin) return false
    return true
  })

  useEffect(() => {
    getActiveModel()
      .then(setActiveModel)
      .catch(() => setActiveModel(null))
  }, [page])

  function handleNav(id) {
    setPage(id)
    if (id === 'high-risk') markAllSeen()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">🛡</div>
          <div>
            <div className="logo-text">FraudShield</div>
            <div className="logo-sub">Detection System</div>
          </div>
        </div>
      </div>

      <span className="nav-section-label">Navigation</span>

      {NAV.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${page === item.id ? 'active' : ''}`}
          onClick={() => handleNav(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
          {item.badge && badgeCount > 0 && (
            <span className="nav-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>
          )}
        </button>
      ))}

      <div className="sidebar-footer">
        {/* Active Model */}
        <div className="active-model-badge">
          <div className="amb-label">Active Model</div>
          {activeModel ? (
            <div className="amb-name">
              <span className="amb-dot" />
              {activeModel.name}
            </div>
          ) : (
            <div className="amb-name" style={{ color: 'var(--danger)' }}>
              ✕ Chưa kích hoạt
            </div>
          )}
        </div>

        {/* User info + logout */}
        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <span className="sidebar-user-avatar">
              {username?.[0]?.toUpperCase() ?? '?'}
            </span>
            <div className="sidebar-user-detail">
              <div className="sidebar-user-name">{username}</div>
              <div className={`sidebar-user-role ${isAdmin ? 'role-admin' : 'role-customer'}`}>
                {isAdmin ? 'Admin' : 'Customer'}
              </div>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Đăng xuất">⏻</button>
        </div>
      </div>
    </aside>
  )
}
