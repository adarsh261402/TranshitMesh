import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useBusTracking from '../hooks/useBusTracking';
import usePeerDiscovery from '../hooks/usePeerDiscovery';
import MapView from '../components/map/MapView';
import ETACard from '../components/ui/ETACard';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import api from '../services/api';
import journeyTracker from '../services/JourneyTracker';

export default function StudentDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const { buses, connected } = useBusTracking();
  const { peers, registerAsPeer } = usePeerDiscovery();
  const [selectedBus, setSelectedBus] = useState(null);
  const [trackedBusId, setTrackedBusId] = useState(null);
  const [ongoingJourney, setOngoingJourney] = useState(null);

  useEffect(() => { registerAsPeer({ lat: 23.1817, lng: 79.9895 }); }, []);

  useEffect(() => {
    api.get('/api/journeys/ongoing').then(r => { if (r.data && r.data._id) setOngoingJourney(r.data); }).catch(() => {});
  }, []);

  // Group buses by route for multi-bus panel
  const routeGroups = {};
  buses.forEach(bus => {
    if (!routeGroups[bus.route]) routeGroups[bus.route] = { label: bus.routeLabel, color: bus.routeColor, buses: [] };
    routeGroups[bus.route].buses.push(bus);
  });

  const handleBoardBus = async (bus, stop) => {
    try {
      const resp = await api.post('/api/journeys/start', {
        busId: bus.busId, busName: bus.name, routeName: bus.route, routeLabel: bus.routeLabel,
        boardingStop: stop ? { name: stop.stopName || stop.name, lat: stop.lat, lng: stop.lng } : { name: 'Current Location', lat: bus.lat, lng: bus.lng },
      });
      setOngoingJourney(resp.data);
      setTrackedBusId(bus.busId);
      window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'success', message: `🎫 Boarded ${bus.name}!` } }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'error', message: err.response?.data?.error || 'Failed to board' } }));
    }
  };

  const handleEndJourney = async () => {
    if (!ongoingJourney) return;
    try {
      const bus = buses.find(b => b.busId === ongoingJourney.busId);
      await api.patch(`/api/journeys/${ongoingJourney._id}/end`, {
        dropOffStop: bus ? { name: 'Current Stop', lat: bus.lat, lng: bus.lng } : { name: 'Unknown', lat: 23.1817, lng: 79.9895 },
      });
      setOngoingJourney(null);
      setTrackedBusId(null);
      window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'success', message: '✅ Journey ended!' } }));
    } catch { window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'error', message: 'Failed to end journey' } })); }
  };

  const handleTrackBus = (busId) => {
    setTrackedBusId(prev => prev === busId ? null : busId);
    const bus = buses.find(b => b.busId === busId);
    if (bus) setSelectedBus(bus);
  };

  const networkLabel = connected ? '🟢 Strong Network' : '🔴 Reconnecting';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* ═══════════ MAP ═══════════ */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(255,253,245,0.95)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, margin: 0 }}>TransitMesh 🚌</h2>
            <span style={{ fontSize: '12px', color: connected ? 'var(--success)' : 'var(--danger)' }}>{networkLabel} — Updating every {connected ? '3s' : '—'}</span>
            {peers.length > 0 && <span style={{ fontSize: '12px', color: 'var(--accent-warm)' }}>👥 {peers.length} peers</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => navigate('/journeys')} className="btn btn-secondary btn-sm">📋 My Journeys</button>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user?.name}</span>
            <button onClick={onLogout} className="btn btn-secondary btn-sm">Logout</button>
          </div>
        </div>

        {/* Ongoing journey banner */}
        {ongoingJourney && (
          <div style={{ position: 'absolute', top: '52px', left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: '#FFF3C4', border: '2px solid #F5C518', borderRadius: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 16px rgba(245,197,24,0.3)' }}>
            <span style={{ fontSize: '14px' }}>🎫</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>On board: {ongoingJourney.busName}</span>
            <button onClick={handleEndJourney} className="btn btn-danger btn-sm" style={{ padding: '4px 12px', fontSize: '11px' }}>End Journey</button>
          </div>
        )}

        {/* Tracking banner */}
        {trackedBusId && !ongoingJourney && (
          <div style={{ position: 'absolute', top: '52px', left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: '#E8F5E9', border: '2px solid #A5D6A7', borderRadius: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#2E7D32' }}>📍 Tracking: {buses.find(b => b.busId === trackedBusId)?.name || trackedBusId}</span>
            <button onClick={() => setTrackedBusId(null)} className="btn btn-secondary btn-sm" style={{ padding: '4px 12px', fontSize: '11px' }}>Stop Tracking</button>
          </div>
        )}

        <ErrorBoundary>
          <MapView
            buses={buses}
            selectedBus={selectedBus}
            onBusSelect={setSelectedBus}
            onBoardBus={handleBoardBus}
            trackedBusId={trackedBusId}
          />
        </ErrorBoundary>
      </div>

      {/* ═══════════ SIDE PANEL ═══════════ */}
      <div style={{ width: '360px', background: 'var(--bg-primary)', borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, margin: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🚌 Active Buses ({buses.length})
        </h3>

        {Object.entries(routeGroups).map(([routeId, group]) => (
          <div key={routeId} className="card" style={{ padding: '10px', borderLeft: `4px solid ${group.color}` }}>
            {/* Route header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700 }}>{group.label}</span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {group.buses.length > 1 ? `🔵 ${group.buses.length} buses` : ''}
              </span>
            </div>

            {/* Individual buses in this route */}
            {group.buses.map(bus => {
              const source = bus.source || 'live';
              const simMode = bus.simulatedMode || 'normal';
              const sourceLabel = simMode === 'offline' ? '🔴 PREDICTED' : simMode === 'weak' ? '🟡 WEAK' : simMode === 'gps_gap' ? '⚠️ GPS GAP' : '🟢 LIVE';
              const delayPill = bus.isDelayed
                ? { text: `⚠️ ${bus.delayMinutes}m DELAYED`, bg: '#FFEBEE', color: '#C62828', border: '#EF9A9A' }
                : { text: '🟢 ON TIME', bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' };

              return (
                <div key={bus.busId} style={{ padding: '8px', background: selectedBus?.busId === bus.busId ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer', transition: 'background 0.15s', border: trackedBusId === bus.busId ? '2px solid var(--accent-primary)' : '1px solid transparent' }}
                  onClick={() => setSelectedBus(bus)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600 }}>{bus.name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>#{bus.busNumber}</span>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '12px', background: simMode === 'offline' ? '#FFEBEE' : simMode === 'weak' ? '#FFF3E0' : '#E8F5E9', color: simMode === 'offline' ? '#C62828' : simMode === 'weak' ? '#E65100' : '#2E7D32' }}>
                      {sourceLabel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>Speed: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{Math.round(bus.speed || 0)} km/h</strong></span>
                    <span>Age: {bus.dataAge || 0}s</span>
                  </div>

                  {/* Delay status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: delayPill.bg, color: delayPill.color, border: `1px solid ${delayPill.border}`, fontWeight: 600 }}>
                      {delayPill.text}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleTrackBus(bus.busId); }}
                      className="btn btn-primary btn-sm" style={{ padding: '3px 10px', fontSize: '10px', background: trackedBusId === bus.busId ? 'var(--accent-hover)' : 'var(--accent-primary)' }}>
                      {trackedBusId === bus.busId ? '📍 Tracking' : '🔍 Track'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Selected bus ETA */}
        {selectedBus && (
          <ETACard busId={selectedBus.busId} source={selectedBus.source} />
        )}
      </div>
    </div>
  );
}
