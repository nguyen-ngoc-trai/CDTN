import { useState } from 'react';
import { useAuth } from '../store/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(form.username, form.password); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg0)', backgroundImage:'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(26,111,223,0.08) 0%, transparent 70%)' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', opacity:0.03, backgroundImage:'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize:'40px 40px' }} />
      <div className="fade-in" style={{ width:'100%', maxWidth:380, padding:'0 20px' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text2)', letterSpacing:4, marginBottom:10 }}>FRAUD DETECTION SYSTEM</div>
          <div style={{ fontSize:28, fontWeight:600, color:'var(--text0)', letterSpacing:-0.5 }}>FraudGuard</div>
          <div style={{ fontSize:13, color:'var(--text1)', marginTop:6 }}>Đăng nhập để tiếp tục</div>
        </div>
        <div className="card" style={{ padding:28 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--text2)', fontFamily:'var(--mono)', letterSpacing:1, marginBottom:6 }}>USERNAME</label>
              <input className="input" type="text" placeholder="admin" value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))} required autoFocus />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--text2)', fontFamily:'var(--mono)', letterSpacing:1, marginBottom:6 }}>PASSWORD</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required />
            </div>
            {error && <div style={{ background:'var(--red-bg)', border:'1px solid #5a1a2a', borderRadius:4, padding:'8px 12px', color:'var(--red)', fontSize:12, marginBottom:16, fontFamily:'var(--mono)' }}>✗ {error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'10px' }}>
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
        <div style={{ textAlign:'center', marginTop:16, fontFamily:'var(--mono)', fontSize:10, color:'var(--text2)', letterSpacing:1 }}>SECURED · JWT AUTH · TLS</div>
      </div>
    </div>
  );
}
