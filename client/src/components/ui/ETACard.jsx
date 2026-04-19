import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function ETACard({ busId, source }) {
  const [etaData, setEtaData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!busId) return;
    setLoading(true);
    const fetchETAs = () => {
      api.get(`/api/eta/${busId}`).then(r => { setEtaData(r.data); setLoading(false); }).catch(() => setLoading(false));
    };
    fetchETAs();
    const iv = setInterval(fetchETAs, 8000);
    return () => clearInterval(iv);
  }, [busId]);

  if (loading) return (
    <div className="card card-accent" style={{ padding: '16px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Calculating ETAs...</span>
      </div>
    </div>
  );

  if (!etaData || !etaData.stops) return null;

  const futureStops = etaData.stops.filter(e => !e.passed);
  const nextStop = futureStops.find(e => e.isNext);
  const avgConfidence = futureStops.length > 0
    ? Math.round(futureStops.reduce((s, e) => s + (e.confidence || 0), 0) / futureStops.length)
    : 0;

  return (
    <div className="card card-accent" style={{ padding: '14px' }}>
      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>
        ⏱ ETA — {etaData.busName}
      </h4>

      {nextStop && (
        <div style={{ background: '#FFF3C4', borderRadius: '8px', padding: '10px', marginBottom: '10px', border: '2px solid #F5C518' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>NEXT STOP</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>🔵 {nextStop.stopName}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {nextStop.etaMinutes === null ? '--' : nextStop.etaMinutes}<span style={{ fontSize: '12px' }}> min</span>
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {nextStop.distanceKm} km away • {nextStop.trafficCondition} traffic
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '200px', overflowY: 'auto' }}>
        {etaData.stops.map((eta, i) => {
          const bg = eta.isNext ? '#FFF3C4' : eta.passed ? '#f5f5f0' : (i % 2 === 0 ? '#FFFDF5' : '#FFF8E1');
          const trafficColors = { clear: '#2E7D32', moderate: '#E65100', heavy: '#C62828' };
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 8px', background: bg, borderRadius: '4px',
              opacity: eta.passed ? 0.5 : 1, textDecoration: eta.passed ? 'line-through' : 'none',
              borderLeft: eta.isNext ? '3px solid #F5C518' : 'none', fontWeight: eta.isNext ? 600 : 400,
            }}>
              <span style={{ fontSize: '12px', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {eta.passed ? '✅' : eta.isNext ? '🔵' : '⏳'} {eta.stopName}
                {source === 'predicted' && !eta.passed && <span style={{ fontSize: '10px', color: '#C62828' }}> (pred)</span>}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {!eta.passed && eta.trafficCondition && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: trafficColors[eta.trafficCondition] || '#2E7D32' }} />
                )}
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '12px', color: eta.passed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {eta.passed ? '--' : eta.etaMinutes === null ? '--' : `${eta.etaMinutes} min`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '10px' }}>
        <div className="confidence-bar" style={{ marginBottom: '4px' }}>
          <div className={`confidence-bar-fill confidence-${avgConfidence >= 71 ? 'high' : avgConfidence >= 41 ? 'medium' : 'low'}`} style={{ width: `${avgConfidence}%`, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Avg confidence: {avgConfidence}% • Speed: {Math.round(etaData.currentSpeed || 0)} km/h • {source || 'live'}
        </div>
      </div>
    </div>
  );
}
