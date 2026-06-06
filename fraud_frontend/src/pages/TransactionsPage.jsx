// src/pages/TransactionsPage.jsx
import { useEffect, useState } from 'react';
import { transactionsApi } from '../services/api';

export default function TransactionsPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    transactionsApi.list(page).then(setData).catch(console.error);
  }, [page]);

  const fmt = (v) => v != null ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 2 }) : '—';
  const fmtDate = (s) => s ? new Date(s).toLocaleString('vi-VN') : '—';
  const shortId = (id) => id ? id.slice(0, 8) + '...' : '—';

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 6 }}>DATA</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>Giao dịch</h1>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text1)' }}>
            {data ? `${data.total.toLocaleString()} giao dịch` : 'Đang tải...'}
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Amount</th><th>Time (s)</th><th>Source</th>
                <th>Fraud Prob.</th><th>Risk</th><th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map(txn => {
                const pred = txn.latest_prediction;
                return (
                  <tr key={txn.id}>
                    <td><span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>{shortId(txn.id)}</span></td>
                    <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--text0)' }}>${fmt(txn.amount)}</span></td>
                    <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--text1)' }}>{txn.time_seconds ?? '—'}</span></td>
                    <td><span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{txn.source}</span></td>
                    <td>
                      {pred ? <span style={{ fontFamily: 'var(--mono)', color: pred.is_fraud ? 'var(--red)' : 'var(--green)' }}>
                        {(pred.fraud_probability * 100).toFixed(1)}%
                      </span> : <span style={{ color: 'var(--text2)' }}>—</span>}
                    </td>
                    <td>
                      {pred ? <span className={`risk-badge risk-${pred.risk_level}`}>{pred.risk_level}</span> : '—'}
                    </td>
                    <td><span style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(txn.created_at)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Trước</button>
            <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: '30px', fontFamily: 'var(--mono)' }}>Trang {page}</span>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setPage(p => p + 1)} disabled={data.items.length < 20}>Sau →</button>
          </div>
        )}
      </div>
    </div>
  );
}
