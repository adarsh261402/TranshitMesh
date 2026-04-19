import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import interpolationEngine from '../services/InterpolationEngine';
import routeConstraintEngine from '../services/RouteConstraintEngine';
import offlineBuffer from '../services/OfflineBuffer';

const SOCKET_URL = 'http://localhost:5000';

export default function useBusTracking() {
  const [buses, setBuses] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const busDataRef = useRef(new Map());
  const offlineTimersRef = useRef(new Map());

  useEffect(() => {
    const token = localStorage.getItem('tm_token');
    const socket = io(SOCKET_URL, { auth: { token }, reconnection: true, reconnectionDelay: 2000, reconnectionAttempts: Infinity });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Clear offline prediction timers on reconnect
      offlineTimersRef.current.forEach(t => clearInterval(t));
      offlineTimersRef.current.clear();
    });
    socket.on('disconnect', () => {
      setConnected(false);
      // Start route-constrained prediction for all known buses
      busDataRef.current.forEach((bus, busId) => {
        startPrediction(busId, bus);
      });
    });

    socket.on('bus:update', (data) => {
      const now = Date.now();
      const existing = busDataRef.current.get(data.busId);
      const dataAge = existing ? Math.round((now - (existing._lastUpdate || now)) / 1000) : 0;

      const busState = {
        ...data,
        source: 'live',
        confidence: 92,
        dataAge,
        isPredicted: false,
        routeComplete: false,
        _lastUpdate: now
      };

      busDataRef.current.set(data.busId, busState);

      // Store route polyline for offline prediction
      if (data.routePolyline && data.routePolyline.length > 1) {
        routeConstraintEngine.setRoute(data.busId, data.routePolyline, data.speed || 20);
        routeConstraintEngine.snapToRoute(data.busId, data.lat, data.lng);
      }

      // If we were predicting, stop and show reconnect toast
      if (offlineTimersRef.current.has(data.busId)) {
        clearInterval(offlineTimersRef.current.get(data.busId));
        offlineTimersRef.current.delete(data.busId);
        window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'success', message: `📡 Back online — ${data.name} location corrected` } }));
      }

      // Interpolation for smooth movement
      interpolationEngine.updateBusPosition(data.busId, data.lat, data.lng, data.speed, data.heading);

      // Buffer for offline
      offlineBuffer.addEntry(data);

      updateBusList();
    });

    socket.on('simulation:state', ({ busId, mode }) => {
      if (mode === 'offline') {
        const bus = busDataRef.current.get(busId);
        if (bus) startPrediction(busId, bus);
      } else if (mode === 'normal') {
        if (offlineTimersRef.current.has(busId)) {
          clearInterval(offlineTimersRef.current.get(busId));
          offlineTimersRef.current.delete(busId);
        }
      }
    });

    // Initial bus fetch
    fetch(`${SOCKET_URL}/api/buses`).then(r => r.json()).then(data => {
      (Array.isArray(data) ? data : []).forEach(bus => {
        const lat = bus.lat || bus.currentLat;
        const lng = bus.lng || bus.currentLng;
        busDataRef.current.set(bus.busId, { ...bus, lat, lng, source: 'live', confidence: 85, dataAge: 0, _lastUpdate: Date.now() });
        if (bus.routePolyline && bus.routePolyline.length > 1) {
          routeConstraintEngine.setRoute(bus.busId, bus.routePolyline, bus.speed || 20);
        }
      });
      updateBusList();
    }).catch(() => {});

    return () => {
      socket.disconnect();
      offlineTimersRef.current.forEach(t => clearInterval(t));
    };
  }, []);

  function startPrediction(busId, bus) {
    if (offlineTimersRef.current.has(busId)) return;
    if (!routeConstraintEngine.hasRoute(busId)) return;

    // Snap current position
    routeConstraintEngine.snapToRoute(busId, bus.lat || bus.currentLat, bus.lng || bus.currentLng);

    const timer = setInterval(() => {
      const prediction = routeConstraintEngine.predictNextPosition(busId, 5);
      if (!prediction) return;

      const current = busDataRef.current.get(busId) || {};
      busDataRef.current.set(busId, {
        ...current,
        lat: prediction.lat,
        lng: prediction.lng,
        source: 'predicted',
        confidence: prediction.confidence,
        isPredicted: true,
        routeComplete: prediction.routeComplete,
        dataAge: prediction.elapsedSeconds,
        _lastUpdate: current._lastUpdate
      });

      if (prediction.routeComplete) {
        clearInterval(offlineTimersRef.current.get(busId));
        offlineTimersRef.current.delete(busId);
      }

      updateBusList();
    }, 5000);

    offlineTimersRef.current.set(busId, timer);
  }

  function updateBusList() {
    const arr = [];
    busDataRef.current.forEach((bus) => arr.push({ ...bus }));
    setBuses(arr);
  }

  return { buses, connected };
}
