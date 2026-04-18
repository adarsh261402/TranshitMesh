import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = 'http://localhost:5000/api';

export default function RegisterForm({ onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', studentId: '', routePreference: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.password) { setError('Name, email, and password are required'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const resp = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, password: form.password,
          studentId: form.studentId, routePreference: form.routePreference
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Registration failed');

      onLogin(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const routes = ['Route-A', 'Route-B', 'Route-C', 'Route-D'];

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label className="input-label" htmlFor="reg-name">Full Name</label>
        <input id="reg-name" type="text" className="input-field" placeholder="John Doe"
          value={form.name} onChange={e => update('name', e.target.value)} />
      </div>

      <div>
        <label className="input-label" htmlFor="reg-email">Email</label>
        <input id="reg-email" type="email" className="input-field" placeholder="you@college.edu"
          value={form.email} onChange={e => update('email', e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label className="input-label" htmlFor="reg-pass">Password</label>
          <input id="reg-pass" type="password" className="input-field" placeholder="Min 6 chars"
            value={form.password} onChange={e => update('password', e.target.value)} />
        </div>
        <div>
          <label className="input-label" htmlFor="reg-confirm">Confirm</label>
          <input id="reg-confirm" type="password" className="input-field" placeholder="Re-enter"
            value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label className="input-label" htmlFor="reg-sid">Student ID</label>
          <input id="reg-sid" type="text" className="input-field" placeholder="STU001"
            value={form.studentId} onChange={e => update('studentId', e.target.value)} />
        </div>
        <div>
          <label className="input-label" htmlFor="reg-route">Preferred Route</label>
          <select id="reg-route" className="input-field" value={form.routePreference}
            onChange={e => update('routePreference', e.target.value)}>
            <option value="">Select...</option>
            {routes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

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
          <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Creating account...</>
        ) : '🚌 Create Account'}
      </button>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--accent-hover)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
      </p>
    </form>
  );
}
