export default function ConfidenceBadge({ source, confidence, dataAge }) {
  const configs = {
    live: { label: '● LIVE', className: 'badge-live' },
    stale: { label: '⚠️ Stale', className: 'badge-peer' },
    peer: { label: '◈ PEER', className: 'badge-peer' },
    predicted: { label: '◌ PREDICTED', className: 'badge-predicted' }
  };

  const config = configs[source] || configs.live;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span className={`badge ${config.className}`}>{config.label}</span>
      {confidence !== undefined && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
          {Math.round(confidence)}%
        </span>
      )}
      {dataAge > 15 && (
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {dataAge}s ago
        </span>
      )}
    </div>
  );
}
