import { useState, useEffect } from 'react';
import MapView from '../components/map/MapView';
import StatusBar from '../components/ui/StatusBar';
import ETACard from '../components/ui/ETACard';
import ConfidenceBadge from '../components/ui/ConfidenceBadge';
import useBusTracking from '../hooks/useBusTracking';
import useNetworkStatus from '../hooks/useNetworkStatus';
import useP2P from '../hooks/useP2P';
import { useToast } from '../components/ui/Toast';

export default function StudentDashboard({ user, onLogout }) {
  const { buses, connected } = useBusTracking();
  const { status, mode } = useNetworkStatus();
  const { p2pStatus } = useP2P(user?.id);
  const { addToast } = useToast();
  const [selectedBus, setSelectedBus] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [mobileTab, setMobileTab] = useState('map');

  // Notification: bus arriving soon
  useEffect(() => {
    const check = setInterval(() => {
      // Simple notification check — could be enhanced
    }, 30000);
    return () => clearInterval(check);
  }, [buses]);

  // Listen for notifications
  useEffect(() => {
    const handler = (e) => {
      const { type, message } = e.detail;
      if (type === 'warning' || type === 'info') {
        addToast(message, type === 'warning' ? 'warning' : 'info');
      }
    };
    window.addEventListener('tm-notification', handler);
    return () => window.removeEventListener('tm-notification', handler);
  }, [addToast]);

  const handleBusSelect = (bus) => {
    setSelectedBus(bus);
    setShowPanel(true);
  };

  const activeBuses = buses.filter(b => b.isActive !== false);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Navigation Bar */}
      <nav style={{
        background: 'var(--bg-primary)',
        borderBottom: '2px solid var(--border)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(245,197,24,0.12)',
        zIndex: 1000,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            TransitMesh 🚌
          </h1>
        </div>

        <StatusBar connectedPeers={p2pStatus.connectedPeers} connected={connected} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {user?.name}
          </span>
          <button onClick={onLogout} className="btn btn-secondary btn-sm">
            Logout
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapView
            buses={activeBuses}
            selectedBus={selectedBus}
            onBusSelect={handleBusSelect}
          />

          {/* Map Legend */}
          <div style={{
            position: 'absolute', bottom: '20px', left: '20px', zIndex: 500,
            background: 'rgba(255,253,245,0.95)', borderRadius: '12px',
            padding: '12px 16px', boxShadow: '0 2px 12px var(--shadow)',
            border: '1px solid var(--border)', fontSize: '11px'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Data Sources</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-live" style={{ fontSize: '10px', padding: '2px 6px' }}>● LIVE</span>
                <span style={{ color: 'var(--text-muted)' }}>Server data, &lt;10s old</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-peer" style={{ fontSize: '10px', padding: '2px 6px' }}>◈ PEER</span>
                <span style={{ color: 'var(--text-muted)' }}>From nearby user</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-predicted" style={{ fontSize: '10px', padding: '2px 6px' }}>◌ PRED</span>
                <span style={{ color: 'var(--text-muted)' }}>Dead reckoning</span>
              </div>
            </div>
          </div>

          {/* P2P Active Banner */}
          {p2pStatus.connectedPeers > 0 && (
            <div style={{
              position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 500, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
              borderRadius: 'var(--radius-pill)', padding: '6px 16px',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '12px', fontWeight: 500, color: 'var(--warning)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <span>📡</span> P2P Active — 👥 {p2pStatus.connectedPeers} peers connected
            </div>
          )}
        </div>

        {/* Side Panel (Desktop) */}
        <div style={{
          width: showPanel ? '360px' : '300px',
          background: 'var(--bg-primary)',
          borderLeft: '1px solid var(--border)',
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          transition: 'width 0.2s ease'
        }}
          className="hide-mobile"
        >
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            🚌 Active Buses ({activeBuses.length})
          </h2>

          {/* Bus List */}
          {activeBuses.map(bus => (
            <div key={bus.busId}
              onClick={() => handleBusSelect(bus)}
              className="card card-accent"
              style={{
                padding: '14px',
                cursor: 'pointer',
                background: selectedBus?.busId === bus.busId ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600 }}>
                    {bus.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{bus.route}</div>
                </div>
                <ConfidenceBadge source={bus.source || 'live'} dataAge={bus.dataAge} />
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Speed: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Math.round(bus.speed || 0)} km/h</span>
                </div>
                {bus.dataAge > 0 && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Age: </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: bus.dataAge > 30 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {bus.dataAge}s
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Selected Bus ETA Card */}
          {selectedBus && (
            <ETACard
              busId={selectedBus.busId}
              stops={selectedBus.stops}
              source={selectedBus.source}
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="mobile-nav" style={{ display: 'none' }}>
        <button className={`mobile-nav-item ${mobileTab === 'map' ? 'active' : ''}`} onClick={() => setMobileTab('map')}>
          <span>🗺️</span> Map
        </button>
        <button className={`mobile-nav-item ${mobileTab === 'buses' ? 'active' : ''}`} onClick={() => setMobileTab('buses')}>
          <span>🚌</span> Buses
        </button>
        <button className={`mobile-nav-item ${mobileTab === 'alerts' ? 'active' : ''}`} onClick={() => setMobileTab('alerts')}>
          <span>🔔</span> Alerts
        </button>
        <button className={`mobile-nav-item ${mobileTab === 'profile' ? 'active' : ''}`} onClick={() => setMobileTab('profile')}>
          <span>👤</span> Profile
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .mobile-nav { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
