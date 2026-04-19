import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import ConfidenceBadge from '../ui/ConfidenceBadge';
import api from '../../services/api';

const JEC_CENTER = [23.1817, 79.9895];
const JEC_ZOOM = 16;

const ROUTE_COLORS = {
  route_1: '#E53935', route_2: '#1E88E5', route_3: '#43A047', route_4: '#8E24AA',
  route_5: '#F4511E', route_6: '#00ACC1', route_7: '#FFB300', route_8: '#6D4C41',
};

const ROUTE_OFFSETS = {
  route_1: 0, route_2: 5, route_3: -5, route_4: 10, route_5: -10, route_6: 15, route_7: -15, route_8: 20,
};

function createBusIcon(source, routeColor, busNumber, simulatedMode) {
  const mode = simulatedMode || 'normal';
  const borderColor = mode === 'offline' ? '#C62828' : mode === 'weak' ? '#E65100' : mode === 'gps_gap' ? '#FF6F00' : (routeColor || '#2E7D32');
  const borderStyle = mode === 'offline' ? 'dashed' : 'solid';
  const pulse = mode === 'normal' && source === 'live' ? 'animation:pulse-ring 2s ease-out infinite;' : '';
  const spinAnim = mode === 'offline' ? 'animation:spin 4s linear infinite;' : '';
  const badge = busNumber ? `<div style="position:absolute;top:-6px;right:-8px;background:white;border:1.5px solid ${borderColor};border-radius:10px;padding:1px 5px;font-size:9px;font-weight:700;color:${borderColor};z-index:3;white-space:nowrap;">${busNumber}</div>` : '';

  return L.divIcon({
    className: 'bus-marker-icon',
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:${source === 'live' ? borderColor + '30' : 'transparent'};${pulse}"></div>
      <div style="width:32px;height:32px;border-radius:50%;background:white;border:3px ${borderStyle} ${borderColor};display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:1;position:relative;${spinAnim}">🚌</div>
      ${badge}
    </div>`,
    iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -24]
  });
}

function MapAutoFit({ buses }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current) {
      map.setView(JEC_CENTER, JEC_ZOOM);
      fitted.current = true;
    }
  }, [map]);
  return null;
}

// ═══════════ PER-STOP ETA POPUP ═══════════
function StopETAPopup({ busId, source, onBoard }) {
  const [etaData, setEtaData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!busId) return;
    setLoading(true);
    const fetchETA = () => {
      api.get(`/api/eta/${busId}`).then(r => { setEtaData(r.data); setLoading(false); }).catch(() => setLoading(false));
    };
    fetchETA();
    const iv = setInterval(fetchETA, 8000);
    return () => clearInterval(iv);
  }, [busId]);

  if (loading) return (
    <div style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Calculating ETAs...</span>
    </div>
  );
  if (!etaData || !etaData.stops) return <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>No ETA data</div>;

  const futureStops = etaData.stops.filter(s => !s.passed);
  const nextStop = futureStops.find(s => s.isNext);

  const trafficPill = (condition) => {
    const colors = { clear: { bg: '#E8F5E9', text: '#2E7D32' }, moderate: { bg: '#FFF8E1', text: '#E65100' }, heavy: { bg: '#FFEBEE', text: '#C62828' } };
    const c = colors[condition] || colors.clear;
    return <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '10px', background: c.bg, color: c.text, fontWeight: 600 }}>{condition}</span>;
  };

  return (
    <div style={{ maxHeight: '240px', overflowY: 'auto', fontSize: '13px' }}>
      {etaData.stops.map((stop, i) => {
        const isPassed = stop.passed;
        const isNext = stop.isNext;
        const bg = isNext ? '#FFF3C4' : isPassed ? '#f5f5f0' : (i % 2 === 0 ? '#FFFDF5' : '#FFF8E1');
        const borderLeft = isNext ? '3px solid #F5C518' : 'none';
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 8px', background: bg, borderLeft, borderRadius: '4px', marginBottom: '2px',
            opacity: isPassed ? 0.5 : 1, textDecoration: isPassed ? 'line-through' : 'none',
            cursor: !isPassed && onBoard ? 'pointer' : 'default', fontWeight: isNext ? 600 : 400,
          }} onClick={() => { if (!isPassed && onBoard) onBoard(stop); }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px' }}>{isPassed ? '✅' : isNext ? '🔵' : '⏳'}</span>
              <span style={{ fontSize: '12px' }}>{stop.stopName}</span>
              {isNext && <span style={{ fontSize: '10px', color: '#F5C518', fontWeight: 700 }}>← NEXT</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {!isPassed && stop.trafficCondition && trafficPill(stop.trafficCondition)}
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '13px', color: isPassed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                {isPassed ? '--' : stop.etaMinutes === null ? '--' : `${stop.etaMinutes} min`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════ ROUTE LEGEND ═══════════
function RouteLegend({ buses, highlightedRoute, onRouteClick }) {
  const [collapsed, setCollapsed] = useState(false);
  const routeMap = new Map();
  buses.forEach(b => {
    if (!routeMap.has(b.route)) {
      const count = buses.filter(x => x.route === b.route).length;
      routeMap.set(b.route, { label: b.routeLabel || b.route, color: b.routeColor || ROUTE_COLORS[b.route], count });
    }
  });

  return (
    <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 500, background: 'rgba(255,253,245,0.97)', borderRadius: '12px', padding: collapsed ? '8px 12px' : '12px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', border: '1px solid var(--border)', maxWidth: '280px', fontSize: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: collapsed ? 0 : '8px' }} onClick={() => setCollapsed(!collapsed)}>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>📍 Route Legend</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '8px' }}>{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && Array.from(routeMap.entries()).map(([route, info]) => (
        <div key={route} onClick={() => onRouteClick(route)} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', cursor: 'pointer',
          opacity: highlightedRoute && highlightedRoute !== route ? 0.3 : 1, transition: 'opacity 0.2s',
        }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: info.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px', flex: 1 }}>{info.label}</span>
          {info.count > 1 && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{info.count} buses</span>}
        </div>
      ))}
    </div>
  );
}

// ═══════════ MAIN MAP VIEW ═══════════
const MapView = memo(function MapView({ buses = [], selectedBus, onBusSelect, onBoardBus, trackedBusId, showStops = true, showRoutes = true, isAdmin = false }) {
  const [highlightedRoute, setHighlightedRoute] = useState(null);

  const handleRouteClick = useCallback((route) => {
    setHighlightedRoute(prev => prev === route ? null : route);
  }, []);

  const handleStopBoard = useCallback((bus, stop) => {
    if (onBoardBus) onBoardBus(bus, stop);
  }, [onBoardBus]);

  // Group routes for polylines
  const routeGroups = {};
  buses.forEach(bus => {
    if (bus.stops && bus.stops.length > 1 && !routeGroups[bus.route]) {
      routeGroups[bus.route] = { stops: bus.stops, color: bus.routeColor || ROUTE_COLORS[bus.route] || '#F5C518' };
    }
  });

  return (
    <MapContainer center={JEC_CENTER} zoom={JEC_ZOOM} style={{ width: '100%', height: '100%' }} zoomControl={false}>
      <TileLayer attribution='&copy; <a href="https://carto.com/">CartoDB</a>' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
      <MapAutoFit buses={buses} />

      {/* Route polylines */}
      {showRoutes && Object.entries(routeGroups).map(([route, { stops, color }]) => {
        const positions = [...stops].sort((a, b) => a.order - b.order).map(s => [s.lat, s.lng]);
        const opacity = highlightedRoute ? (highlightedRoute === route ? 0.9 : 0.15) : 0.7;
        const offset = ROUTE_OFFSETS[route] || 0;
        const offsetPositions = positions.map((pos, i) => {
          if (i === 0 || offset === 0) return pos;
          const prev = positions[i - 1];
          const dx = pos[1] - prev[1], dy = pos[0] - prev[0];
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          return [pos[0] + (-dx / len * offset * 0.00002), pos[1] + (dy / len * offset * 0.00002)];
        });
        return <Polyline key={route} positions={offsetPositions} pathOptions={{ color, weight: 4, opacity, dashArray: highlightedRoute === route ? undefined : '8 6' }} />;
      })}

      {/* Stop markers */}
      {showStops && Object.entries(routeGroups).map(([route, { stops, color }]) => {
        const opacity = highlightedRoute ? (highlightedRoute === route ? 1 : 0.2) : 0.8;
        return stops.sort((a, b) => a.order - b.order).map((stop, i) => (
          <CircleMarker key={`${route}-stop-${i}`} center={[stop.lat, stop.lng]} radius={5} pathOptions={{ fillColor: color, fillOpacity: opacity, color: 'white', weight: 2, opacity }}>
            <Tooltip direction="top" offset={[0, -8]} permanent={false}><span style={{ fontSize: '11px' }}>#{stop.order + 1} {stop.name}</span></Tooltip>
          </CircleMarker>
        ));
      })}

      {/* Bus markers */}
      {buses.filter(b => b.lat && b.lng && b.isActive !== false).map(bus => {
        const source = bus.source || 'live';
        const routeColor = bus.routeColor || ROUTE_COLORS[bus.route] || '#2E7D32';
        const confidence = bus.confidence || (source === 'live' ? 92 : source === 'weak' ? 70 : 45);
        const isDimmed = trackedBusId && trackedBusId !== bus.busId;
        const delayBadge = bus.isDelayed ? `🔴 ${bus.delayMinutes}m late` : bus.delayMinutes === 0 ? '🟢 On Time' : null;

        return (
          <Marker key={bus.busId} position={[bus.lat, bus.lng]}
            icon={createBusIcon(source, routeColor, bus.busNumber, bus.simulatedMode)}
            opacity={isDimmed ? 0.35 : 1}
            eventHandlers={{ click: () => onBusSelect?.(bus) }}>
            <Popup maxWidth={320} minWidth={260}>
              <div style={{ padding: '10px', fontFamily: 'var(--font-body)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, margin: 0 }}>{bus.name}</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bus.routeLabel || bus.route} • #{bus.busNumber}</span>
                  </div>
                  <ConfidenceBadge source={source} confidence={confidence} dataAge={bus.dataAge} />
                </div>

                {/* Speed + Delay */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '12px' }}>
                  <span>Speed: <strong style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(bus.speed || 0)} km/h</strong></span>
                  {delayBadge && <span style={{
                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                    background: bus.isDelayed ? '#FFEBEE' : '#E8F5E9',
                    color: bus.isDelayed ? '#C62828' : '#2E7D32',
                    border: `1px solid ${bus.isDelayed ? '#EF9A9A' : '#A5D6A7'}`,
                  }}>{delayBadge}</span>}
                  {bus.scheduledDepartureTime && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Scheduled: {bus.scheduledDepartureTime}</span>
                  )}
                </div>

                {/* Per-stop ETA */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Stop-by-Stop ETA</div>
                  <StopETAPopup busId={bus.busId} source={source} onBoard={(stop) => handleStopBoard(bus, stop)} />
                </div>

                {/* Confidence bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <div className="confidence-bar"><div className={`confidence-bar-fill confidence-${confidence >= 71 ? 'high' : confidence >= 41 ? 'medium' : 'low'}`} style={{ width: `${confidence}%` }} /></div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{confidence}% confidence • {source}</div>
                </div>

                {!isAdmin && (
                  <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '10px' }} onClick={() => onBoardBus?.(bus, null)}>
                    🎫 Board This Bus
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      <RouteLegend buses={buses} highlightedRoute={highlightedRoute} onRouteClick={handleRouteClick} />
    </MapContainer>
  );
});

export default MapView;
