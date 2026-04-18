import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import interpolationEngine from '../services/InterpolationEngine';
import offlineBuffer from '../services/OfflineBuffer';
import networkManager from '../services/NetworkManager';

const SOCKET_URL = 'http://localhost:5000';

export default function useBusTracking() {
  const [buses, setBuses] = useState({});
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const interpolationRef = useRef(null);
  const busesRef = useRef({});

  useEffect(() => {
    const token = localStorage.getItem('tm_token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('bus:update', (data) => {
      const { busId, lat, lng, speed, heading, timestamp, name, route, isActive } = data;

      interpolationEngine.updateBusPosition(busId, lat, lng, speed, heading, networkManager.updateInterval);

      busesRef.current = {
        ...busesRef.current,
        [busId]: {
          ...busesRef.current[busId],
          busId, name, route, isActive,
          lat, lng, speed, heading,
          lastUpdated: timestamp || new Date().toISOString(),
          source: data.source || 'live',
          dataAge: 0
        }
      };
      setBuses({ ...busesRef.current });

      // Buffer for offline sync
      if (networkManager.currentMode !== 'online') {
        offlineBuffer.addEntry({ busId, lat, lng, speed, heading, timestamp: Date.now() });
      }
    });

    socket.on('notification', (data) => {
      window.dispatchEvent(new CustomEvent('tm-notification', { detail: data }));
    });

    socket.on('simulation:state', (data) => {
      window.dispatchEvent(new CustomEvent('tm-simulation', { detail: data }));
    });

    // Handle P2P data
    const handleP2PData = (e) => {
      const { buses: peerBuses } = e.detail;
      if (!Array.isArray(peerBuses)) return;
      peerBuses.forEach(pb => {
        if (pb.busId && pb.lat && pb.lng) {
          interpolationEngine.updateBusPosition(pb.busId, pb.lat, pb.lng, pb.speed, pb.heading);
          busesRef.current = {
            ...busesRef.current,
            [pb.busId]: {
              ...busesRef.current[pb.busId],
              ...pb,
              source: 'peer',
              lastUpdated: new Date().toISOString()
            }
          };
        }
      });
      setBuses({ ...busesRef.current });
    };

    window.addEventListener('p2p-bus-data', handleP2PData);

    // Interpolation loop — update positions every 100ms
    interpolationRef.current = setInterval(() => {
      let updated = false;
      const newBuses = { ...busesRef.current };

      Object.keys(newBuses).forEach(busId => {
        const pos = interpolationEngine.getInterpolatedPosition(busId);
        if (pos) {
          const dataAge = interpolationEngine.getDataAge(busId);
          let source = newBuses[busId]?.source || 'live';

          if (dataAge > 60) {
            // Switch to predicted mode
            const predicted = interpolationEngine.predictPosition(busId);
            if (predicted) {
              newBuses[busId] = {
                ...newBuses[busId],
                lat: predicted.lat,
                lng: predicted.lng,
                source: 'predicted',
                confidence: predicted.confidence,
                dataAge: Math.round(dataAge),
                isPredicted: true
              };
              updated = true;
              return;
            }
          }

          if (dataAge > 15 && source === 'live') {
            source = 'stale';
          }

          newBuses[busId] = {
            ...newBuses[busId],
            lat: pos.lat,
            lng: pos.lng,
            interpolatedSpeed: pos.speed,
            dataAge: Math.round(dataAge),
            source
          };
          updated = true;
        }
      });

      if (updated) {
        busesRef.current = newBuses;
        setBuses(newBuses);
      }
    }, 100);

    // Initial fetch
    fetch(`${SOCKET_URL}/api/buses`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const busMap = {};
          data.forEach(bus => {
            busMap[bus.busId] = {
              busId: bus.busId,
              name: bus.name,
              route: bus.route,
              lat: bus.currentLat,
              lng: bus.currentLng,
              speed: bus.speed,
              heading: bus.heading,
              stops: bus.stops,
              isActive: bus.isActive,
              lastUpdated: bus.lastUpdated,
              source: 'live',
              dataAge: 0
            };
            interpolationEngine.updateBusPosition(bus.busId, bus.currentLat, bus.currentLng, bus.speed, bus.heading);
          });
          busesRef.current = busMap;
          setBuses(busMap);
        }
      })
      .catch(err => console.error('Failed to fetch buses:', err));

    return () => {
      socket.disconnect();
      clearInterval(interpolationRef.current);
      window.removeEventListener('p2p-bus-data', handleP2PData);
    };
  }, []);

  const subscribeRoute = useCallback((routeId) => {
    socketRef.current?.emit('subscribe:route', { routeId });
  }, []);

  return { buses: Object.values(buses), busMap: buses, connected, subscribeRoute, socket: socketRef };
}
