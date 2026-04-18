import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = 'http://localhost:5000/api';

export default function LoginForm({ onLogin, isAdmin = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) { setError('All fields are required'); return; }
    if (isAdmin && !adminCode) { setError('Admin code is required'); return; }

    setLoading(true);
    try {
      const endpoint = isAdmin ? `${API}/auth/admin/login` : `${API}/auth/login`;
      const body = isAdmin ? { email, password, adminCode } : { email, password };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Login failed');

      onLogin(data.user, data.token);
      navigate(isAdmin ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label className="input-label" htmlFor="login-email">Email</label>
        <input id="login-email" type="email" className="input-field" placeholder="you@college.edu"
          value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
      </div>

      <div>
        <label className="input-label" htmlFor="login-password">Password</label>
        <input id="login-password" type="password" className="input-field" placeholder="••••••••"
          value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
      </div>

      {isAdmin && (
        <div>
          <label className="input-label" htmlFor="admin-code">Admin Code</label>
          <input id="admin-code" type="password" className="input-field" placeholder="Enter admin access code"
            value={adminCode} onChange={e => setAdminCode(e.target.value)} />
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px',
          background: 'var(--danger-bg)', color: 'var(--danger)',
          fontSize: '13px', border: '1px solid var(--danger-border)'
        }}>
          {error}
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
        style={{ width: '100%', marginTop: '4px', opacity: loading ? 0.7 : 1 }}>
        {loading ? (
          <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Signing in...</>
        ) : (
          isAdmin ? '🔐 Sign in as Admin' : '🚌 Sign in'
        )}
      </button>

      {!isAdmin && (
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent-hover)', fontWeight: 600, textDecoration: 'none' }}>Register</Link>
        </p>
      )}
    </form>
  );
}
