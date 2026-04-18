import { useState } from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState(null); // null, 'student', 'admin'

  // Landing page
  if (!mode) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at center, #FFF8E1 0%, #FFFDF5 70%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div className="animate-fadeIn" style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(245,197,24,0.15)',
          padding: '48px 40px',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🚌</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            TransitMesh
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '36px' }}>
            Track smarter, travel better
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
              onClick={() => setMode('student')}>
              🎓 Login as Student
            </button>
            <button className="btn btn-secondary btn-lg" style={{ width: '100%' }}
              onClick={() => setMode('admin')}>
              🔐 Login as Admin
            </button>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>New student?</p>
            <Link to="/register" className="btn btn-secondary" style={{ width: '100%', textDecoration: 'none', display: 'flex' }}>
              ✨ Create Account
            </Link>
          </div>

          <div style={{ marginTop: '24px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'left' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>Demo Credentials</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Student: student1@college.edu / Student@123<br />
              Admin: admin@college.edu / Admin@123<br />
              Admin Code: TRANSIT_ADMIN_2024
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at center, #FFF8E1 0%, #FFFDF5 70%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="animate-fadeIn" style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(245,197,24,0.15)',
        padding: '36px 32px',
        maxWidth: '420px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '36px', marginBottom: '4px' }}>🚌</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700 }}>
            {mode === 'admin' ? 'Admin Login' : 'Student Login'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {mode === 'admin' ? 'Access the control panel' : 'Track your campus buses'}
          </p>
        </div>

        <LoginForm onLogin={onLogin} isAdmin={mode === 'admin'} />

        <button onClick={() => setMode(null)}
          style={{
            display: 'block', width: '100%', marginTop: '16px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)'
          }}>
          ← Back to role selection
        </button>
      </div>
    </div>
  );
}
