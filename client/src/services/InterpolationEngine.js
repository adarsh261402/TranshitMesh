// InterpolationEngine — Smooth bus movement between GPS updates
class InterpolationEngine {
  constructor() {
    this.buses = new Map(); // busId → interpolation state
    this.animationFrame = null;
    this.listeners = new Map();
  }

  updateBusPosition(busId, newLat, newLng, speed, heading, updateInterval = 5000) {
    const existing = this.buses.get(busId);
    if (existing) {
      this.buses.set(busId, {
        previousLat: existing.currentLat || existing.targetLat,
        previousLng: existing.currentLng || existing.targetLng,
        targetLat: newLat,
        targetLng: newLng,
        currentLat: existing.currentLat || existing.targetLat,
        currentLng: existing.currentLng || existing.targetLng,
        lastUpdateTime: Date.now(),
        updateInterval,
        speed: speed || 0,
        heading: heading || 0
      });
    } else {
      this.buses.set(busId, {
        previousLat: newLat,
        previousLng: newLng,
        targetLat: newLat,
        targetLng: newLng,
        currentLat: newLat,
        currentLng: newLng,
        lastUpdateTime: Date.now(),
        updateInterval,
        speed: speed || 0,
        heading: heading || 0
      });
    }
  }

  getInterpolatedPosition(busId) {
    const state = this.buses.get(busId);
    if (!state) return null;

    const elapsed = Date.now() - state.lastUpdateTime;
    const progress = Math.min(elapsed / state.updateInterval, 1.0);

    const lat = state.previousLat + (state.targetLat - state.previousLat) * progress;
    const lng = state.previousLng + (state.targetLng - state.previousLng) * progress;

    state.currentLat = lat;
    state.currentLng = lng;

    return { lat, lng, progress, speed: state.speed, heading: state.heading };
  }

  // Dead reckoning when completely offline
  predictPosition(busId) {
    const state = this.buses.get(busId);
    if (!state) return null;

    const speedKmh = state.speed || 15;
    const headingRad = (state.heading || 0) * Math.PI / 180;
    const elapsed = (Date.now() - state.lastUpdateTime) / 1000; // seconds

    const distanceKm = (speedKmh * elapsed) / 3600;
    const newLat = state.currentLat + (distanceKm / 111) * Math.cos(headingRad);
    const newLng = state.currentLng + (distanceKm / (111 * Math.cos(state.currentLat * Math.PI / 180))) * Math.sin(headingRad);

    // Calculate degrading confidence
    const confidenceDrop = Math.floor(elapsed / 30) * 5;
    const confidence = Math.max(10, 70 - confidenceDrop);

    return {
      lat: newLat,
      lng: newLng,
      confidence,
      isPredicted: true,
      elapsedSeconds: Math.round(elapsed),
      speed: speedKmh,
      heading: state.heading
    };
  }

  getDataAge(busId) {
    const state = this.buses.get(busId);
    if (!state) return Infinity;
    return (Date.now() - state.lastUpdateTime) / 1000;
  }

  removeBus(busId) {
    this.buses.delete(busId);
  }

  subscribe(busId, fn) {
    if (!this.listeners.has(busId)) this.listeners.set(busId, new Set());
    this.listeners.get(busId).add(fn);
    return () => this.listeners.get(busId)?.delete(fn);
  }
}

const interpolationEngine = new InterpolationEngine();
export default interpolationEngine;
