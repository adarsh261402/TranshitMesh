// RouteConstraintEngine — Route-snapped dead reckoning for offline prediction
import interpolationEngine from './InterpolationEngine';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentDistance(pLat, pLng, aLat, aLng, bLat, bLng) {
  const dx = bLat - aLat, dy = bLng - aLng;
  if (dx === 0 && dy === 0) return haversineKm(pLat, pLng, aLat, aLng);
  let t = ((pLat - aLat) * dx + (pLng - aLng) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return haversineKm(pLat, pLng, aLat + t * dx, aLng + t * dy);
}

class RouteConstraintEngine {
  constructor() {
    this.busRoutes = new Map(); // busId → { polyline, segIdx, progress, speedKmh }
  }

  setRoute(busId, polyline, speedKmh = 20) {
    if (!polyline || polyline.length < 2) return;
    this.busRoutes.set(busId, {
      polyline,
      segIdx: 0,
      progress: 0,
      speedKmh,
      lastUpdateTime: Date.now()
    });
  }

  findNearestSegmentIndex(lat, lng, polyline) {
    let minDist = Infinity, idx = 0;
    for (let i = 0; i < polyline.length - 1; i++) {
      const d = pointToSegmentDistance(lat, lng, polyline[i][0], polyline[i][1], polyline[i + 1][0], polyline[i + 1][1]);
      if (d < minDist) { minDist = d; idx = i; }
    }
    // Calculate progress along the nearest segment
    const seg = polyline[idx], next = polyline[Math.min(idx + 1, polyline.length - 1)];
    const segLen = haversineKm(seg[0], seg[1], next[0], next[1]);
    const distFromStart = haversineKm(seg[0], seg[1], lat, lng);
    const progress = segLen > 0 ? Math.min(1, distFromStart / segLen) : 0;
    return { segIdx: idx, progress, distance: minDist };
  }

  snapToRoute(busId, lat, lng) {
    const state = this.busRoutes.get(busId);
    if (!state) return { lat, lng };

    const { segIdx, progress } = this.findNearestSegmentIndex(lat, lng, state.polyline);
    state.segIdx = segIdx;
    state.progress = progress;
    state.lastUpdateTime = Date.now();

    const seg = state.polyline[segIdx];
    const next = state.polyline[Math.min(segIdx + 1, state.polyline.length - 1)];
    return {
      lat: seg[0] + (next[0] - seg[0]) * progress,
      lng: seg[1] + (next[1] - seg[1]) * progress,
      segIdx,
      progress
    };
  }

  // Predict next position along polyline (dead reckoning)
  predictNextPosition(busId, elapsedSeconds = 5) {
    const state = this.busRoutes.get(busId);
    if (!state) return null;

    const { polyline, speedKmh } = state;
    const distToTravel = speedKmh * (elapsedSeconds / 3600); // km
    let remaining = distToTravel;
    let segIdx = state.segIdx;
    let progress = state.progress;
    let routeComplete = false;

    while (remaining > 0 && segIdx < polyline.length - 1) {
      const seg = polyline[segIdx];
      const next = polyline[segIdx + 1];
      const segLen = haversineKm(seg[0], seg[1], next[0], next[1]);
      const distToEndOfSeg = segLen * (1 - progress);

      if (remaining <= distToEndOfSeg) {
        progress += (segLen > 0) ? (remaining / segLen) : 0;
        remaining = 0;
      } else {
        remaining -= distToEndOfSeg;
        segIdx++;
        progress = 0;
      }
    }

    // Boundary: bus reached end of route
    if (segIdx >= polyline.length - 1) {
      segIdx = polyline.length - 2;
      progress = 1;
      routeComplete = true;
    }

    const seg = polyline[segIdx];
    const next = polyline[Math.min(segIdx + 1, polyline.length - 1)];
    const predictedLat = seg[0] + (next[0] - seg[0]) * progress;
    const predictedLng = seg[1] + (next[1] - seg[1]) * progress;

    // Update state
    state.segIdx = segIdx;
    state.progress = progress;

    // Calculate degrading confidence
    const totalElapsed = (Date.now() - state.lastUpdateTime) / 1000;
    const confidenceDrop = Math.floor(totalElapsed / 30) * 5;
    const confidence = Math.max(10, 70 - confidenceDrop);

    return {
      lat: predictedLat,
      lng: predictedLng,
      segIdx,
      progress,
      confidence,
      isPredicted: true,
      routeComplete,
      elapsedSeconds: Math.round(totalElapsed)
    };
  }

  hasRoute(busId) {
    return this.busRoutes.has(busId);
  }

  getRouteState(busId) {
    return this.busRoutes.get(busId) || null;
  }

  removeBus(busId) {
    this.busRoutes.delete(busId);
  }
}

const routeConstraintEngine = new RouteConstraintEngine();
export default routeConstraintEngine;
