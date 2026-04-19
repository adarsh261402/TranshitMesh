import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '../components/map/MapView';
import StatusBar from '../components/ui/StatusBar';
import ETACard from '../components/ui/ETACard';
import ConfidenceBadge from '../components/ui/ConfidenceBadge';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import useBusTracking from '../hooks/useBusTracking';
import useNetworkStatus from '../hooks/useNetworkStatus';
import useP2P from '../hooks/useP2P';
import { useToast } from '../components/ui/Toast';
import journeyTracker from '../services/JourneyTracker';

export default function StudentDashboard({ user, onLogout }) {
  const { buses, connected } = useBusTracking();
  const { status, mode } = useNetworkStatus();
  const { p2pStatus } = useP2P(user?.id);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [selectedBus, setSelectedBus] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [ongoingJourney, setOngoingJourney] = useState(null);
  const [boardingModal, setBoardingModal] = useState(null); // {bus, stop}

  // Check for ongoing journey on mount
  useEffect(() => {
    journeyTracker.checkOngoing().then(j => setOngoingJourney(j));
    const unsub = journeyTracker.subscribe(j => setOngoingJourney(j));
    return unsub;
  }, []);

  const handleBusSelect = useCallback((bus) => {
    setSelectedBus(bus);
    setShowPanel(true);
  }, []);

  const handleBoardBus = useCallback(async (bus, stop) => {
    if (ongoingJourney) {
      addToast('You already have an ongoing journey. End it first.', 'warning');
      return;
    }
    // If no specific stop, show stop selection
    if (!stop && bus.stops?.length > 0) {
      setBoardingModal(bus);
      return;
    }
    const boardingStop = stop || bus.stops?.[0] || { name: 'Unknown', lat: bus.lat, lng: bus.lng };
    try {
      await journeyTracker.startJourney(bus, boardingStop);
      addToast(`🎫 Boarded ${bus.name}! Enjoy your ride.`, 'success');
      setBoardingModal(null);
    } catch (err) {
      addToast(typeof err === 'string' ? err : 'Failed to board', 'error');
    }
  }, [ongoingJourney, addToast]);

  const handleEndJourney = useCallback(async (stop) => {
    try {
      await journeyTracker.endJourney(stop || null);
      addToast('✅ Journey completed! Check your history.', 'success');
    } catch (err) {
      addToast(typeof err === 'string' ? err : 'Failed to end journey', 'error');
    }
  }, [addToast]);

  const activeBuses = buses.filter(b => b.isActive !== false);

  // Find the ongoing journey bus data
  const ongoingBus = ongoingJourney ? activeBuses.find(b => b.busId === ongoingJourney.busId) : null;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Nav */}
      <nav style={{ background: 'var(--bg-primary)', borderBottom: '2px solid var(--border)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(245,197,24,0.12)', zIndex: 1000, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>TransitMesh 🚌</h1>
        </div>
        <StatusBar connectedPeers={p2pStatus.connectedPeers} connected={connected} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => navigate('/journeys')} className="btn btn-secondary btn-sm">📋 My Journeys</button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user?.name}</span>
          <button onClick={onLogout} className="btn btn-secondary btn-sm">Logout</button>
        </div>
      </nav>

      {/* Ongoing Journey Banner */}
      {ongoingJourney && (
        <div style={{ background: '#FFF3C4', borderBottom: '2px solid #F5C518', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 999, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500 }}>
            <span>🚌</span>
            <span>Currently on <strong>{ongoingJourney.busName}</strong> — {ongoingJourney.routeLabel || ongoingJourney.routeName}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>from {ongoingJourney.boardingStop?.name}</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => handleEndJourney(null)}>🏁 End Journey</button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <ErrorBoundary fallbackTitle="Map temporarily unavailable" fallbackMessage="Showing last known data. Please try again.">
            <MapView buses={activeBuses} selectedBus={selectedBus} onBusSelect={handleBusSelect} onBoardBus={handleBoardBus} />
          </ErrorBoundary>

          {/* P2P Banner */}
          {p2pStatus.connectedPeers > 0 && (
            <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-pill)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 500, color: 'var(--warning)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <span>📡</span> P2P Active — 👥 {p2pStatus.connectedPeers} peers
            </div>
          )}

          {/* Floating End Journey button */}
          {ongoingJourney && ongoingBus && (
            <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 500 }}>
              <button className="btn btn-primary" style={{ boxShadow: '0 4px 16px rgba(245,197,24,0.4)', fontSize: '14px', padding: '10px 24px' }}
                onClick={() => {
                  // Try to find the nearest stop to end at
                  const bus = activeBuses.find(b => b.busId === ongoingJourney.busId);
                  const nearestStop = bus?.stops?.reduce((best, s) => {
                    const d = Math.abs(s.lat - bus.lat) + Math.abs(s.lng - bus.lng);
                    return (!best || d < best.d) ? { ...s, d } : best;
                  }, null);
                  handleEndJourney(nearestStop || null);
                }}>
                🏁 End Journey at Nearest Stop
              </button>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div style={{ width: showPanel ? '360px' : '300px', background: 'var(--bg-primary)', borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'width 0.2s ease' }} className="hide-mobile">
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>🚌 Active Buses ({activeBuses.length})</h2>
          {activeBuses.map(bus => (
            <div key={bus.busId} onClick={() => handleBusSelect(bus)} className="card card-accent"
              style={{ padding: '14px', cursor: 'pointer', background: selectedBus?.busId === bus.busId ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', transition: 'all 0.15s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600 }}>{bus.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bus.routeLabel || bus.route}</div>
                </div>
                <ConfidenceBadge source={bus.source || 'live'} dataAge={bus.dataAge} />
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Speed: </span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Math.round(bus.speed || 0)} km/h</span></div>
                {bus.dataAge > 0 && <div><span style={{ color: 'var(--text-muted)' }}>Age: </span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: bus.dataAge > 30 ? 'var(--danger)' : 'var(--text-primary)' }}>{bus.dataAge}s</span></div>}
              </div>
            </div>
          ))}
          {selectedBus && <ETACard busId={selectedBus.busId} stops={selectedBus.stops} source={selectedBus.source} />}
        </div>
      </div>

      {/* Boarding Stop Selection Modal */}
      {boardingModal && (
        <div className="modal-overlay" onClick={() => setBoardingModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '12px' }}>🎫 Select Boarding Stop</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Where are you boarding <strong>{boardingModal.name}</strong>?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {boardingModal.stops?.sort((a, b) => a.order - b.order).map((stop, i) => (
                <button key={i} className="btn btn-secondary" style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                  onClick={() => handleBoardBus(boardingModal, stop)}>
                  #{stop.order + 1} {stop.name}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setBoardingModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Mobile Nav */}
      <div className="mobile-nav" style={{ display: 'none' }}>
        <button className="mobile-nav-item active"><span>🗺️</span> Map</button>
        <button className="mobile-nav-item" onClick={() => navigate('/journeys')}><span>📋</span> Journeys</button>
        <button className="mobile-nav-item"><span>🔔</span> Alerts</button>
        <button className="mobile-nav-item"><span>👤</span> Profile</button>
      </div>
      <style>{`@media (max-width: 768px) { .hide-mobile { display: none !important; } .mobile-nav { display: flex !important; } }`}</style>
    </div>
  );
}
