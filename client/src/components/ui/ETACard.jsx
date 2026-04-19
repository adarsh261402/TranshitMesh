import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function ETACard({ busId, stops, source }) {
  const [etas, setEtas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avgConfidence, setAvgConfidence] = useState(0);

  useEffect(() => {
    if (!busId) return;
    setLoading(true);
    const fetchETAs = () => {
      api.get(`/api/eta/${busId}`).then(r => {
        const data = r.data || [];
        setEtas(data);
        if (data.length > 0) {
          const avg = data.reduce((s, e) => s + e.confidence, 0) / data.length;
          setAvgConfidence(Math.round(avg));
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    };
    fetchETAs();
    const iv = setInterval(fetchETAs, 10000);
    return () => clearInterval(iv);
  }, [busId]);

  if (loading) return (
    <div className="card card-accent" style={{ padding: '16px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Calculating ETAs<span className="pulse-dots">...</span></span>
      </div>
    </div>
  );

  const futureStops = etas.filter(e => !e.isPassed);
  const nextStop = futureStops[0];

  return (
    <div className="card card-accent" style={{ padding: '14px' }}>
      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>
        ⏱ ETA to Stops
      </h4>
      {nextStop && (
        <div style={{ background: '#FFF3C4', borderRadius: '8px', padding: '10px', marginBottom: '10px', border: '2px solid #F5C518' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>NEXT STOP</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>🔵 {nextStop.stopName}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{nextStop.etaMinutes}<span style={{ fontSize: '12px' }}> min</span></span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{nextStop.distanceKm} km away • {nextStop.trafficCondition} traffic</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '180px', overflowY: 'auto' }}>
        {etas.map((eta, i) => {
          const bg = eta.isNext ? '#FFF3C4' : eta.isPassed ? '#f5f5f0' : (i % 2 === 0 ? '#FFFDF5' : '#FFF8E1');
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', background: bg, borderRadius: '4px', opacity: eta.isPassed ? 0.5 : 1 }}>
              <span style={{ fontSize: '12px', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {eta.isPassed ? '✅' : eta.isNext ? '🔵' : '⏳'} {eta.stopName}
                {source === 'predicted' && !eta.isPassed && <span style={{ fontSize: '10px', color: '#C62828' }}> (predicted)</span>}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '12px', color: eta.isPassed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                {eta.isPassed ? '—' : `${eta.etaMinutes} min`}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '10px' }}>
        <div className="confidence-bar" style={{ marginBottom: '4px' }}>
          <div className={`confidence-bar-fill confidence-${avgConfidence >= 71 ? 'high' : avgConfidence >= 41 ? 'medium' : 'low'}`} style={{ width: `${avgConfidence}%` }} />
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>Avg confidence: {avgConfidence}% • {etas[0]?.source || source}</div>
      </div>
    </div>
  );
}
