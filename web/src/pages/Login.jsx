import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr('');
    if (!username.trim() || !password) { setErr('Username dan password wajib diisi'); return; }
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') submit();
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">Maintenance<span> Dashboard</span></div>
        <div className="login-sub">Masuk sebagai Admin untuk mengakses dashboard</div>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Username</label>
          <input className="form-input" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={onKeyDown} autoComplete="username" />
        </div>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onKeyDown} autoComplete="current-password" />
        </div>
        <button className="btn primary" style={{ width: '100%', padding: 11 }} disabled={busy} onClick={submit}>
          {busy ? 'Memproses…' : 'Masuk'}
        </button>
        <div className="login-err">{err}</div>
      </div>
    </div>
  );
}
