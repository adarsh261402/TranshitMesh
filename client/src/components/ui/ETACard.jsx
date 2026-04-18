import { useState, useEffect } from 'react';
import ETAService from '../../services/ETAService';

export default function ETACard({ busId, stops, source = 'live', onStopSelect }) {
  const [etas, setEtas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);

  useEffect(() => {
    if (!busId) return;
    setLoading(true);
    ETAService.getAllETAs(busId).then(data => {
      setEtas(Array.isArray(data) ? data : []);
      setLoading(false);
    });

    const interval = setInterval(() => {
      ETAService.getAllETAs(busId).then(data => {
        setEtas(Array.isArray(data) ? data : []);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [busId]);

  const getConfidenceForSource = (confidence) => {
    if (source === 'peer') return Math.max(10, confidence - 15);
    if (source === 'predicted') return Math.max(10, confidence - 30);
    return confidence;
  };

  if (loading) {
    return (
      <div className="card card-accent" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading ETAs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-accent" style={{ padding: '16px' }}>
      <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        🕐 Estimated Arrivals
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {etas.length === 0 && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No ETA data available</p>
        )}
        {etas.slice(0, 5).map((eta, i) => {
          const conf = getConfidenceForSource(eta.confidence);
          const confClass = ETAService.getConfidenceClass(conf);
          return (
            <div key={i}
              onClick={() => { setSelectedStop(eta.stopName); onStopSelect?.(eta); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                background: selectedStop === eta.stopName ? 'var(--bg-tertiary)' : 'transparent',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {eta.stopName}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <div className="confidence-bar" style={{ width: '80px' }}>
                    <div className={`confidence-bar-fill ${confClass}`} style={{ width: `${conf}%` }} />
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700,
                  color: 'var(--text-primary)', lineHeight: 1
                }}>
                  {ETAService.formatETA(eta.etaMinutes)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {conf}% confidence
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
