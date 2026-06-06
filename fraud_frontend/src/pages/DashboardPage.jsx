// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { reportsApi, modelsApi } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

function StatCard({ label, value, sub, accent, mono }) {
  return (
    <div className="card fade-in" style={{ borderTop: `2px solid ${accent || 'var(--border)'}` }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', letterSpacing: 1, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: mono ? 22 : 26, fontFamily: mono ? 'var(--mono)' : 'var(--sans)', fontWeight: mono ? 500 : 600, color: accent || 'var(--text0)', letterSpacing: mono ? 1 : -0.5, marginBottom: 4 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text1)' }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 4, padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text1)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--text0)' }}>Total: {payload[0]?.value}</div>
      <div style={{ color: 'var(--red)' }}>Fraud: {payload[1]?.value}</div>
    </div>
  );
};

export default function DashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportsApi.dashboard(),
      reportsApi.timeseries(14),
      modelsApi.active().catch(() => null),
    ]).then(([s, ts, m]) => {
      setStats(s);
      setSeries([...ts].reverse());
      setModel(m);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 40, color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12 }}>
      LOADING DASHBOARD...
    </div>
  );

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 6 }}>OVERVIEW</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, color: 'var(--text0)' }}>Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="TỔNG GIAO DỊCH" value={stats?.total_transactions?.toLocaleString()} sub="Tất cả thời gian" accent="var(--blue)" />
        <StatCard label="PHÁT HIỆN GIAN LẬN" value={stats?.fraud_count?.toLocaleString()} sub={`${stats?.fraud_rate_pct}% tổng giao dịch`} accent="var(--red)" />
        <StatCard label="TỔNG TIỀN GIAN LẬN" value={`$${(stats?.total_fraud_amount || 0).toLocaleString()}`} sub="Ước tính tổn thất" accent="var(--amber)" />
        <StatCard label="CẢNH BÁO CHƯA ĐỌC" value={stats?.unread_alerts} sub="Cần xử lý" accent="var(--green)" mono />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Time series */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 4 }}>LỊCH SỬ 14 NGÀY</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text0)' }}>Giao dịch theo ngày</div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => reportsApi.exportCsv(true)}>
              Xuất CSV
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4a9eff" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4a9eff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gFraud" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4d6a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ff4d6a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#5a6880', fontSize: 10, fontFamily: 'var(--mono)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5a6880', fontSize: 10, fontFamily: 'var(--mono)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#4a9eff" strokeWidth={1.5} fill="url(#gTotal)" dot={false} />
              <Area type="monotone" dataKey="fraud" stroke="#ff4d6a" strokeWidth={1.5} fill="url(#gFraud)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text1)' }}>
              <span style={{ width: 20, height: 2, background: 'var(--blue)', display: 'inline-block', borderRadius: 1 }} />Tổng giao dịch
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text1)' }}>
              <span style={{ width: 20, height: 2, background: 'var(--red)', display: 'inline-block', borderRadius: 1 }} />Gian lận
            </div>
          </div>
        </div>

        {/* Active model */}
        <div className="card">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 16 }}>MODEL ĐANG HOẠT ĐỘNG</div>
          {model ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>{model.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text1)', marginBottom: 20 }}>{model.algorithm}</div>
              {[
                { label: 'F1 Score', value: model.f1_score, color: 'var(--green)' },
                { label: 'Precision', value: model.precision_score, color: 'var(--blue)' },
                { label: 'Recall', value: model.recall_score, color: 'var(--amber)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{label}</span>
                    <span style={{ fontSize: 11, color, fontFamily: 'var(--mono)' }}>{value ? (value * 100).toFixed(1) + '%' : '—'}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${(value || 0) * 100}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>
                Threshold: <span style={{ color: 'var(--text0)' }}>{model.threshold}</span>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text2)', fontSize: 13 }}>
              Chưa có model active.{' '}
              <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => onNavigate('models')}>
                Cài đặt ngay →
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 16 }}>THAO TÁC NHANH</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={() => onNavigate('predict')}>◈ Dự đoán giao dịch mới</button>
          <button className="btn btn-ghost" onClick={() => onNavigate('alerts')}>◉ Xem cảnh báo</button>
          <button className="btn btn-ghost" onClick={() => reportsApi.exportCsv()}>↓ Xuất báo cáo CSV</button>
        </div>
      </div>
    </div>
  );
}
