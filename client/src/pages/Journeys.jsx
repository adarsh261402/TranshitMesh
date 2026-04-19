import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import journeyTracker from '../services/JourneyTracker';

function SkeletonCard() {
  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      <div style={{ width: '2px', background: 'var(--border)', flexShrink: 0, position: 'relative' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-tertiary)', position: 'absolute', top: '20px', left: '-5px' }} />
      </div>
      <div className="card" style={{ flex: 1, padding: '16px', opacity: 0.5 }}>
        <div style={{ height: '16px', width: '60%', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '12px' }} />
        <div style={{ height: '12px', width: '80%', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '8px' }} />
        <div style={{ height: '12px', width: '50%', background: 'var(--bg-tertiary)', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

function JourneyCard({ journey }) {
  const statusColors = { completed: '#2E7D32', ongoing: '#E6B800', cancelled: '#C62828' };
  const statusBg = { completed: '#E8F5E9', ongoing: '#FFF8E1', cancelled: '#FFEBEE' };
  const statusIcons = { completed: '✅', ongoing: '🚌', cancelled: '❌' };

  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      {/* Timeline connector */}
      <div style={{ width: '2px', background: 'var(--border)', borderStyle: 'dashed', flexShrink: 0, position: 'relative', minHeight: '120px' }}>
        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: statusColors[journey.status], border: '3px solid white', boxShadow: '0 0 0 2px ' + statusColors[journey.status], position: 'absolute', top: '20px', left: '-6px', zIndex: 1 }} />
      </div>

      {/* Journey card */}
      <div className="card card-accent" style={{ flex: 1, padding: '16px', borderLeft: `4px solid ${statusColors[journey.status]}`, marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              🚌 {journey.busName} — {journey.routeLabel || journey.routeName}
            </h4>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
            background: statusBg[journey.status], color: statusColors[journey.status],
            textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>
            {statusIcons[journey.status]} {journey.status}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <div>📍 From: <strong>{journey.boardingStop?.name || 'Unknown'}</strong></div>
          {journey.dropOffStop && <div>🏁 To: <strong>{journey.dropOffStop.name}</strong></div>}
          <div>🕐 Boarded: <strong>{journey.boardingTime ? format(new Date(journey.boardingTime), 'EEE dd MMM, h:mm a') : 'N/A'}</strong></div>
        </div>

        {journey.status === 'completed' && (
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              ⏱ Duration: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{journey.durationMinutes} min</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              📏 Distance: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{journey.distanceKm} km</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Journeys({ user }) {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [routeFilter, setRouteFilter] = useState('');
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const routes = ['Route-1', 'Route-2', 'Route-3', 'Route-4', 'Route-5', 'Route-6', 'Route-7', 'Route-8'];

  const fetchJourneys = async () => {
    setLoading(true);
    const data = await journeyTracker.getHistory(user?.id, page, routeFilter);
    setJourneys(data.journeys || []);
    setTotalPages(data.totalPages || 0);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => { fetchJourneys(); }, [page, routeFilter, user?.id]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-primary)', borderBottom: '2px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(245,197,24,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>←</button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>My Journeys</h1>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{total} total</span>
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-sm">🗺️ Back to Map</button>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <select className="input-field" style={{ flex: 1, minWidth: '150px' }} value={routeFilter} onChange={e => { setRouteFilter(e.target.value); setPage(1); }}>
            <option value="">All Routes</option>
            {routes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Timeline */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : journeys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚌</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No journeys yet</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto' }}>Board a bus to get started! Tap any bus on the map and hit "Board This Bus".</p>
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ marginTop: '20px' }}>🗺️ Go to Map</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {journeys.map(j => <JourneyCard key={j._id} journey={j} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '6px 12px' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
