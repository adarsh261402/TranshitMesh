import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import ConfidenceBadge from '../ui/ConfidenceBadge';
import api from '../../services/api';

const ROUTE_COLORS = {
  'Route-1': '#E53935', 'Route-2': '#1E88E5', 'Route-3': '#43A047', 'Route-4': '#8E24AA',
  'Route-5': '#F4511E', 'Route-6': '#00ACC1', 'Route-7': '#FFB300', 'Route-8': '#6D4C41',
  'Route-A': '#E53935', 'Route-B': '#1E88E5', 'Route-C': '#43A047', 'Route-D': '#8E24AA'
};
const ROUTE_OFFSETS = { 'Route-1': 0, 'Route-2': 5, 'Route-3': -5, 'Route-4': 10, 'Route-5': -10, 'Route-6': 15, 'Route-7': -15, 'Route-8': 20 };

function createBusIcon(source, routeColor) {
  const borderColor = source === 'predicted' ? '#C62828' : source === 'peer' ? '#E65100' : (routeColor || '#2E7D32');
  const pulse = source === 'live' ? `animation:pulse-ring 2s ease-out infinite;` : '';
  const dash = source === 'predicted' ? `border-style:dashed;animation:spin 3s linear infinite;` : '';
  return L.divIcon({
    className: 'bus-marker-icon',
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;width:40px;height:40px;border-radius:50%;background:${source === 'live' ? borderColor + '30' : 'transparent'};${pulse}"></div><div style="width:32px;height:32px;border-radius:50%;background:white;border:3px solid ${borderColor};display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:1;position:relative;${dash}">🚌</div></div>`,
    iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20]
  });
}

function MapAutoFit({ buses }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (buses.length > 0 && !fitted.current) {
      const bounds = L.latLngBounds(buses.map(b => [b.lat, b.lng]));
      if (bounds.isValid()) { map.fitBounds(bounds.pad(0.3)); fitted.current = true; }
    }
  }, [buses, map]);
  return null;
}

function StopETAPopup({ busId, stops, busSpeed, source, onBoard }) {
  const [etas, setEtas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!busId) return;
    setLoading(true);
    api.get(`/api/eta/${busId}`).then(r => { setEtas(r.data || []); setLoading(false); }).catch(() => setLoading(false));
    const iv = setInterval(() => { api.get(`/api/eta/${busId}`).then(r => setEtas(r.data || [])).catch(() => {}); }, 10000);
    return () => clearInterval(iv);
  }, [busId]);

  if (loading) return <div style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Calculating ETAs...</span></div>;

  return (
    <div style={{ maxHeight: '250px', overflowY: 'auto', fontSize: '13px' }}>
      {etas.map((eta, i) => {
        const bg = eta.isNext ? '#FFF3C4' : eta.isPassed ? '#f5f5f0' : (i % 2 === 0 ? '#FFFDF5' : '#FFF8E1');
        const border = eta.isNext ? '2px solid #F5C518' : 'none';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: bg, border, borderRadius: '6px', marginBottom: '2px', opacity: eta.isPassed ? 0.5 : 1, cursor: !eta.isPassed ? 'pointer' : 'default' }}
            onClick={() => { if (!eta.isPassed && onBoard) onBoard(eta); }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '12px' }}>{eta.isPassed ? '✅' : eta.isNext ? '🔵' : '⏳'} {eta.stopName}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '13px', color: eta.isPassed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
              {eta.isPassed ? 'passed' : `${eta.etaMinutes} min`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RouteLegend({ buses, highlightedRoute, onRouteClick }) {
  const [collapsed, setCollapsed] = useState(false);
  const routeSet = new Map();
  buses.forEach(b => { if (!routeSet.has(b.route)) routeSet.set(b.route, b.routeLabel || b.route); });

  return (
    <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 500, background: 'rgba(255,253,245,0.97)', borderRadius: '12px', padding: collapsed ? '8px 12px' : '12px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', border: '1px solid var(--border)', maxWidth: '280px', fontSize: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: collapsed ? 0 : '8px' }} onClick={() => setCollapsed(!collapsed)}>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>📍 Route Legend</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && Array.from(routeSet.entries()).map(([route, label]) => (
        <div key={route} onClick={() => onRouteClick(route)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', cursor: 'pointer', opacity: highlightedRoute && highlightedRoute !== route ? 0.3 : 1, transition: 'opacity 0.2s' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: ROUTE_COLORS[route] || '#999', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const MapView = memo(function MapView({ buses = [], selectedBus, onBusSelect, onBoardBus, showStops = true, showRoutes = true, isAdmin = false }) {
  const [highlightedRoute, setHighlightedRoute] = useState(null);
  const defaultCenter = [28.5459, 77.1926];

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
      routeGroups[bus.route] = bus.stops;
    }
  });

  return (
    <MapContainer center={defaultCenter} zoom={15} style={{ width: '100%', height: '100%' }} zoomControl={false}>
      <TileLayer attribution='&copy; <a href="https://carto.com/">CartoDB</a>' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
      <MapAutoFit buses={buses} />

      {/* Route polylines with offset */}
      {showRoutes && Object.entries(routeGroups).map(([route, stops]) => {
        const positions = [...stops].sort((a, b) => a.order - b.order).map(s => [s.lat, s.lng]);
        const color = ROUTE_COLORS[route] || '#F5C518';
        const opacity = highlightedRoute ? (highlightedRoute === route ? 0.9 : 0.15) : 0.7;
        const offset = ROUTE_OFFSETS[route] || 0;
        // Manual offset by shifting lat/lng slightly perpendicular
        const offsetPositions = positions.map((pos, i) => {
          if (i === 0 || offset === 0) return pos;
          const prev = positions[i - 1];
          const dx = pos[1] - prev[1], dy = pos[0] - prev[0];
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const perpLat = -dx / len * offset * 0.00002;
          const perpLng = dy / len * offset * 0.00002;
          return [pos[0] + perpLat, pos[1] + perpLng];
        });
        return (
          <Polyline key={route} positions={offsetPositions} pathOptions={{ color, weight: 4, opacity, dashArray: highlightedRoute === route ? undefined : '8 6' }} />
        );
      })}

      {/* Stop markers */}
      {showStops && buses.map(bus => {
        const color = ROUTE_COLORS[bus.route] || '#F5C518';
        const opacity = highlightedRoute ? (highlightedRoute === bus.route ? 1 : 0.2) : 0.8;
        return bus.stops?.sort((a, b) => a.order - b.order).map((stop, i) => (
          <CircleMarker key={`${bus.busId}-stop-${i}`} center={[stop.lat, stop.lng]} radius={5} pathOptions={{ fillColor: color, fillOpacity: opacity, color: 'white', weight: 2, opacity }}>
            <Tooltip direction="top" offset={[0, -8]} permanent={false}><span style={{ fontSize: '11px' }}>#{stop.order + 1} {stop.name}</span></Tooltip>
          </CircleMarker>
        ));
      })}

      {/* Bus markers */}
      {buses.filter(b => b.lat && b.lng && b.isActive !== false).map(bus => {
        const source = bus.source || 'live';
        const routeColor = ROUTE_COLORS[bus.route] || '#2E7D32';
        const confidence = bus.confidence || (source === 'live' ? 92 : source === 'peer' ? 70 : 45);
        return (
          <Marker key={bus.busId} position={[bus.lat, bus.lng]} icon={createBusIcon(source, routeColor)} eventHandlers={{ click: () => onBusSelect?.(bus) }}>
            <Popup maxWidth={300} minWidth={240}>
              <div style={{ padding: '10px', fontFamily: 'var(--font-body)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, margin: 0 }}>{bus.name}</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bus.routeLabel || bus.route}</span>
                  </div>
                  <ConfidenceBadge source={source} confidence={confidence} dataAge={bus.dataAge} />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '12px' }}>
                  <span>Speed: <strong style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(bus.speed || 0)} km/h</strong></span>
                  {bus.routeComplete && <span className="badge badge-predicted">🏁 End of Route</span>}
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Stop-by-Stop ETA</div>
                  <StopETAPopup busId={bus.busId} stops={bus.stops} busSpeed={bus.speed} source={source}
                    onBoard={(stop) => handleStopBoard(bus, stop)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <div className="confidence-bar"><div className={`confidence-bar-fill confidence-${confidence >= 71 ? 'high' : confidence >= 41 ? 'medium' : 'low'}`} style={{ width: `${confidence}%` }} /></div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{confidence}% confidence • {source}</div>
                </div>
                {!isAdmin && (
                  <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '10px' }}
                    onClick={() => onBoardBus?.(bus, null)}>
                    🎫 Board This Bus
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Route Legend */}
      <RouteLegend buses={buses} highlightedRoute={highlightedRoute} onRouteClick={handleRouteClick} />
    </MapContainer>
  );
});

export default MapView;
