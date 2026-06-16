import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Sai tên đăng nhập hoặc mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">🛡</div>
          <div>
            <div className="login-logo-text">FraudShield</div>
            <div className="login-logo-sub">Detection System</div>
          </div>
        </div>

        <h2 className="login-title">Đăng nhập</h2>
        <p className="login-desc">Vui lòng nhập thông tin tài khoản để tiếp tục.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">Tên đăng nhập</label>
            <input
              className="login-input"
              type="text"
              placeholder="admin hoặc customer"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label">Mật khẩu</label>
            <input
              className="login-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="login-error">⚠ {error}</div>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <div className="login-hint">
          <div className="login-hint-row">
            <span className="login-hint-role admin-badge">Admin</span>
            <code>admin</code> / <code>admin123</code>
          </div>
          <div className="login-hint-row">
            <span className="login-hint-role customer-badge">Customer</span>
            <code>customer</code> / <code>customer123</code>
          </div>
        </div>
      </div>
    </div>
  )
}
