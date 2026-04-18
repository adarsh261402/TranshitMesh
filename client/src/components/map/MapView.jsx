import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import ConfidenceBadge from '../ui/ConfidenceBadge';
import ETAService from '../../services/ETAService';

// Bus icon factory
function createBusIcon(source) {
  const colors = { live: '#2E7D32', peer: '#E65100', predicted: '#C62828', stale: '#E65100' };
  const color = colors[source] || colors.live;
  const pulseColor = source === 'live' ? 'rgba(46,125,50,0.3)' : 'transparent';

  return L.divIcon({
    className: 'bus-marker-icon',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:${pulseColor};animation:${source === 'live' ? 'pulse-ring 2s ease-out infinite' : 'none'};"></div>
        <div style="width:32px;height:32px;border-radius:50%;background:white;border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:1;position:relative;">
          🚌
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
}

// Stop icon
const stopIcon = L.divIcon({
  className: 'stop-marker-icon',
  html: `<div style="width:12px;height:12px;border-radius:50%;background:var(--accent-primary);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Auto-fit map to bus positions
function MapAutoFit({ buses }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (buses.length > 0 && !fitted.current) {
      const bounds = L.latLngBounds(buses.map(b => [b.lat, b.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.3));
        fitted.current = true;
      }
    }
  }, [buses, map]);

  return null;
}

export default function MapView({ buses = [], selectedBus, onBusSelect, showStops = true, showRoutes = true, isAdmin = false }) {
  const [etaCache, setEtaCache] = useState({});

  // Fetch ETA for selected bus
  useEffect(() => {
    if (!selectedBus) return;
    ETAService.getAllETAs(selectedBus.busId).then(etas => {
      setEtaCache(prev => ({ ...prev, [selectedBus.busId]: etas }));
    });
  }, [selectedBus?.busId]);

  // Center: IIT Delhi campus area
  const defaultCenter = [28.5459, 77.1926];

  // Group buses by route for polylines
  const routeGroups = {};
  buses.forEach(bus => {
    if (bus.stops && bus.stops.length > 1) {
      if (!routeGroups[bus.route]) routeGroups[bus.route] = bus.stops;
    }
  });

  const routeColors = {
    'Route-A': '#F5C518',
    'Route-B': '#FF9800',
    'Route-C': '#2E7D32',
    'Route-D': '#1976D2'
  };

  return (
    <MapContainer
      center={defaultCenter}
      zoom={16}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <MapAutoFit buses={buses} />

      {/* Route polylines */}
      {showRoutes && Object.entries(routeGroups).map(([route, stops]) => {
        const positions = [...stops].sort((a, b) => a.order - b.order).map(s => [s.lat, s.lng]);
        return (
          <Polyline
            key={route}
            positions={positions}
            pathOptions={{
              color: routeColors[route] || '#F5C518',
              weight: 3,
              opacity: 0.5,
              dashArray: '8 6'
            }}
          />
        );
      })}

      {/* Stop markers */}
      {showStops && buses.map(bus =>
        bus.stops?.sort((a, b) => a.order - b.order).map((stop, i) => (
          <CircleMarker
            key={`${bus.busId}-stop-${i}`}
            center={[stop.lat, stop.lng]}
            radius={5}
            pathOptions={{
              fillColor: routeColors[bus.route] || '#F5C518',
              fillOpacity: 0.8,
              color: 'white',
              weight: 2
            }}
          >
            <Popup>
              <div style={{ padding: '8px', fontFamily: 'var(--font-body)' }}>
                <strong style={{ fontSize: '13px' }}>{stop.name}</strong>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{bus.route}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))
      )}

      {/* Bus markers */}
      {buses.filter(b => b.lat && b.lng && b.isActive !== false).map(bus => {
        const etas = etaCache[bus.busId] || [];
        const nextEta = etas[0];
        const source = bus.source || 'live';
        const confidence = bus.confidence || (source === 'live' ? 92 : source === 'peer' ? 70 : 45);

        return (
          <Marker
            key={bus.busId}
            position={[bus.lat, bus.lng]}
            icon={createBusIcon(source)}
            eventHandlers={{
              click: () => onBusSelect?.(bus)
            }}
          >
            <Popup maxWidth={280} minWidth={220}>
              <div style={{ padding: '12px', fontFamily: 'var(--font-body)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, margin: 0 }}>
                      {bus.name}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{bus.route}</span>
                  </div>
                  <ConfidenceBadge source={source} confidence={confidence} dataAge={bus.dataAge} />
                </div>

                {/* Speed */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Speed</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 600 }}>
                      {Math.round(bus.speed || 0)} <span style={{ fontSize: '11px', fontWeight: 400 }}>km/h</span>
                    </div>
                  </div>
                  {nextEta && (
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Next Stop</div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{nextEta.stopName}</div>
                    </div>
                  )}
                </div>

                {/* ETA */}
                {nextEta && (
                  <div style={{
                    background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px',
                    borderLeft: '3px solid var(--accent-primary)'
                  }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>ETA</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 700 }}>
                      {ETAService.formatETA(nextEta.etaMinutes)}
                    </div>
                    <div className="confidence-bar" style={{ marginTop: '6px' }}>
                      <div
                        className={`confidence-bar-fill ${ETAService.getConfidenceClass(confidence)}`}
                        style={{ width: `${confidence}%` }}
                      />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {confidence}% confidence • {nextEta.source || source}
                    </div>
                  </div>
                )}

                {/* Last update */}
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
                  Updated: {bus.lastUpdated ? new Date(bus.lastUpdated).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
