import { useState, useEffect, useRef } from 'react';
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
  const simStateRef = useRef({});

  useEffect(() => {
    const token = localStorage.getItem('tm_token');
    const socket = io(SOCKET_URL, { auth: { token }, reconnection: true, reconnectionDelay: 2000, reconnectionAttempts: Infinity });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      offlineTimersRef.current.forEach(t => clearInterval(t));
      offlineTimersRef.current.clear();
    });

    socket.on('disconnect', () => {
      setConnected(false);
      busDataRef.current.forEach((bus, busId) => { startPrediction(busId, bus); });
    });

    socket.on('bus:update', (data) => {
      const now = Date.now();
      const existing = busDataRef.current.get(data.busId);
      const dataAge = existing ? Math.round((now - (existing._lastUpdate || now)) / 1000) : 0;
      const sim = simStateRef.current[data.busId];

      const busState = {
        ...data,
        lat: data.lat || data.currentLat,
        lng: data.lng || data.currentLng,
        source: sim?.mode === 'weak' ? 'weak' : 'live',
        confidence: sim?.mode === 'weak' ? 70 : 92,
        dataAge,
        isPredicted: false,
        routeComplete: false,
        simulatedMode: sim?.mode || 'normal',
        _lastUpdate: now,
      };

      busDataRef.current.set(data.busId, busState);

      if (data.routePolyline && data.routePolyline.length > 1) {
        routeConstraintEngine.setRoute(data.busId, data.routePolyline, data.speed || 20);
        routeConstraintEngine.snapToRoute(data.busId, busState.lat, busState.lng);
      }

      if (offlineTimersRef.current.has(data.busId)) {
        clearInterval(offlineTimersRef.current.get(data.busId));
        offlineTimersRef.current.delete(data.busId);
        window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'success', message: `🟢 ${data.name} restored to live tracking` } }));
      }

      interpolationEngine.updateBusPosition(data.busId, busState.lat, busState.lng, data.speed, data.heading);
      offlineBuffer.addEntry(data);
      updateBusList();
    });

    // ═══════════ SIMULATION STATE CHANGES ═══════════
    socket.on('simulation:changed', ({ busId, mode, startedAt }) => {
      simStateRef.current[busId] = mode === 'normal' ? undefined : { mode, startedAt };
      if (mode === 'normal') delete simStateRef.current[busId];

      const current = busDataRef.current.get(busId);
      if (current) {
        current.simulatedMode = mode;
        if (mode === 'offline') {
          current.source = 'predicted';
          current.confidence = 50;
          startPrediction(busId, current);
          window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'warning', message: `🔴 ${current.name} went offline — prediction mode active` } }));
        } else if (mode === 'weak') {
          current.source = 'weak';
          current.confidence = 70;
          window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'info', message: `🟡 ${current.name} on weak network — reduced updates` } }));
        } else if (mode === 'gps_gap') {
          current.source = 'predicted';
          window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'warning', message: `⚠️ ${current.name} GPS signal lost — estimating position` } }));
        } else {
          current.source = 'live';
          current.confidence = 92;
          if (offlineTimersRef.current.has(busId)) {
            clearInterval(offlineTimersRef.current.get(busId));
            offlineTimersRef.current.delete(busId);
          }
          window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'success', message: `🟢 ${current.name} restored to live tracking` } }));
        }
        busDataRef.current.set(busId, { ...current });
      }
      updateBusList();
    });

    // ═══════════ DELAY UPDATES ═══════════
    socket.on('bus:delay_update', ({ busId, delayMinutes, isDelayed }) => {
      const current = busDataRef.current.get(busId);
      if (current) {
        current.delayMinutes = delayMinutes;
        current.isDelayed = isDelayed;
        busDataRef.current.set(busId, { ...current });
        if (isDelayed && delayMinutes >= 5) {
          window.dispatchEvent(new CustomEvent('tm-notification', { detail: { type: 'warning', message: `⚠️ ${current.name} is running ${delayMinutes} min late` } }));
        }
      }
      updateBusList();
    });

    // Initial fetch
    fetch(`${SOCKET_URL}/api/buses`).then(r => r.json()).then(data => {
      (Array.isArray(data) ? data : []).forEach(bus => {
        const lat = bus.lat || bus.currentLat;
        const lng = bus.lng || bus.currentLng;
        busDataRef.current.set(bus.busId, {
          ...bus, lat, lng, source: 'live', confidence: 85, dataAge: 0, simulatedMode: 'normal',
          isPredicted: false, routeComplete: false, _lastUpdate: Date.now(),
        });
        if (bus.routePolyline && bus.routePolyline.length > 1) {
          routeConstraintEngine.setRoute(bus.busId, bus.routePolyline, bus.speed || 20);
        }
      });
      updateBusList();
    }).catch(() => {});

    // Fetch simulation state
    fetch(`${SOCKET_URL}/api/admin/simulate`)
      .then(r => r.ok ? r.json() : {})
      .then(state => {
        simStateRef.current = state || {};
        Object.entries(state || {}).forEach(([busId, sim]) => {
          const bus = busDataRef.current.get(busId);
          if (bus) {
            bus.simulatedMode = sim.mode;
            if (sim.mode === 'offline') { bus.source = 'predicted'; bus.confidence = 50; }
            else if (sim.mode === 'weak') { bus.source = 'weak'; bus.confidence = 70; }
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
    routeConstraintEngine.snapToRoute(busId, bus.lat || bus.currentLat, bus.lng || bus.currentLng);

    const timer = setInterval(() => {
      const prediction = routeConstraintEngine.predictNextPosition(busId, 5);
      if (!prediction) return;
      const current = busDataRef.current.get(busId) || {};
      busDataRef.current.set(busId, {
        ...current, lat: prediction.lat, lng: prediction.lng,
        source: 'predicted', confidence: prediction.confidence,
        isPredicted: true, routeComplete: prediction.routeComplete,
        dataAge: prediction.elapsedSeconds, simulatedMode: 'offline',
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
    busDataRef.current.forEach(bus => arr.push({ ...bus }));
    setBuses(arr);
  }

  return { buses, connected, socket: socketRef };
}
