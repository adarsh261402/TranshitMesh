import RegisterForm from '../components/auth/RegisterForm';

export default function Register({ onLogin }) {
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
        maxWidth: '480px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '4px' }}>🚌</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700 }}>
            Join TransitMesh
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Create your student account
          </p>
        </div>
        <RegisterForm onLogin={onLogin} />
      </div>
    </div>
  );
}
