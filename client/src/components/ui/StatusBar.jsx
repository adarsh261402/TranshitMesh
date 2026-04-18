import useNetworkStatus from '../../hooks/useNetworkStatus';

export default function StatusBar({ connectedPeers = 0, connected = false }) {
  const { status, mode } = useNetworkStatus();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap'
    }}>
      {/* Network status pill */}
      <div className={`network-bar network-${status.color}`}>
        <span>{status.icon}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{status.label}</span>
        <span style={{ opacity: 0.8, fontSize: '11px' }}>— {status.sublabel}</span>
      </div>

      {/* P2P indicator */}
      {connectedPeers > 0 && (
        <div className="network-bar" style={{
          background: 'var(--warning-bg)',
          color: 'var(--warning)'
        }}>
          <span>👥</span>
          <span>{connectedPeers} peer{connectedPeers !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Server connection */}
      <div className={`network-bar ${connected ? 'network-strong' : 'network-offline'}`}
        style={{ fontSize: '11px' }}>
        <span style={{ fontSize: '8px' }}>{connected ? '●' : '○'}</span>
        <span>{connected ? 'Server' : 'Disconnected'}</span>
      </div>
    </div>
  );
}
