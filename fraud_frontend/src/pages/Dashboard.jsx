import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts'
import { getDashboardStats, getTimeSeries, getFeatureImportance } from '../lib/api'

const RISK_COLORS = { HIGH: '#ff4d6d', MEDIUM: '#ffb347', LOW: '#7ec8e3', SAFE: '#00e5a0' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [series, setSeries]   = useState([])
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboardStats(), getTimeSeries(), getFeatureImportance()])
      .then(([s, ts, fi]) => { setStats(s); setSeries(ts); setFeatures(fi) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="loading-state">
      <div className="spinner" />
      Đang tải dữ liệu...
    </div>
  )

  const riskPieData = stats ? [
    { name: 'HIGH',   value: stats.high_risk_count,   fill: '#ff4d6d' },
    { name: 'MEDIUM', value: stats.medium_risk_count, fill: '#ffb347' },
    { name: 'LOW',    value: stats.low_risk_count,    fill: '#7ec8e3' },
    { name: 'SAFE',   value: stats.safe_count,        fill: '#00e5a0' },
  ].filter(d => d.value > 0) : []

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Tổng quan hệ thống phát hiện gian lận theo thời gian thực</p>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon">⟁</div>
            <div className="stat-label">Tổng giao dịch</div>
            <div className="stat-value">{stats.total_transactions.toLocaleString()}</div>
            <div className="stat-sub">Tất cả thời gian</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-icon">⚠</div>
            <div className="stat-label">Gian lận phát hiện</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.total_fraud.toLocaleString()}</div>
            <div className="stat-sub">Tỷ lệ {stats.fraud_rate_pct.toFixed(3)}%</div>
          </div>
          <div className="stat-card safe">
            <div className="stat-icon">✓</div>
            <div className="stat-label">Bình thường</div>
            <div className="stat-value" style={{ color: 'var(--safe)' }}>{stats.total_normal.toLocaleString()}</div>
            <div className="stat-sub">Giao dịch hợp lệ</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">◈</div>
            <div className="stat-label">Rủi ro cao</div>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.high_risk_count.toLocaleString()}</div>
            <div className="stat-sub">Cần xem xét ngay</div>
          </div>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="chart-grid">
        <div className="card">
          <div className="card-title">Giao dịch theo thời gian</div>
          {series.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>
              Chưa có dữ liệu. Hãy upload CSV để xem biểu đồ.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={series} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00e5a0" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFraud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff4d6d" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#4a5a72', fontSize: 10, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#4a5a72', fontSize: 10, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="normal" name="Bình thường" stroke="#00e5a0" fill="url(#gNormal)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="fraud"  name="Gian lận"    stroke="#ff4d6d" fill="url(#gFraud)"  strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-title">Phân bố rủi ro</div>
          {riskPieData.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={riskPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                  {riskPieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Feature importance */}
      <div className="card">
        <div className="card-title">Feature Importance — Top 10</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={features.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 30, top: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fill: '#4a5a72', fontSize: 10, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} tickFormatter={v => (v * 100).toFixed(1) + '%'} />
            <YAxis type="category" dataKey="feature" tick={{ fill: '#8a9bb5', fontSize: 11, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} width={90} />
            <Tooltip formatter={v => [(v * 100).toFixed(2) + '%', 'Importance']} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 12 }} />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
              {features.slice(0, 10).map((_, i) => (
                <Cell key={i} fill={`hsl(${190 - i * 8}, 80%, ${60 - i * 2}%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
