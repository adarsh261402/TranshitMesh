// JourneyTracker — client-side journey state management
import api from './api';

class JourneyTracker {
  constructor() {
    this.currentJourney = null;
    this.listeners = new Set();
  }

  async checkOngoing() {
    try {
      const { data } = await api.get('/api/journeys/ongoing');
      this.currentJourney = data.journey;
      this._notify();
      return this.currentJourney;
    } catch { return null; }
  }

  async startJourney(bus, boardingStop) {
    try {
      const { data } = await api.post('/api/journeys/start', {
        busId: bus.busId,
        busName: bus.name,
        routeName: bus.route,
        routeLabel: bus.routeLabel || '',
        boardingStop: {
          name: boardingStop.name,
          lat: boardingStop.lat,
          lng: boardingStop.lng
        }
      });
      this.currentJourney = data;
      this._notify();
      return data;
    } catch (err) {
      throw err.response?.data?.error || 'Failed to start journey';
    }
  }

  async endJourney(dropOffStop) {
    if (!this.currentJourney) throw 'No ongoing journey';
    try {
      const { data } = await api.patch(`/api/journeys/${this.currentJourney._id}/end`, {
        dropOffStop: dropOffStop ? {
          name: dropOffStop.name,
          lat: dropOffStop.lat,
          lng: dropOffStop.lng
        } : null
      });
      this.currentJourney = null;
      this._notify();
      return data;
    } catch (err) {
      throw err.response?.data?.error || 'Failed to end journey';
    }
  }

  async cancelJourney() {
    if (!this.currentJourney) return;
    try {
      await api.patch(`/api/journeys/${this.currentJourney._id}/cancel`);
      this.currentJourney = null;
      this._notify();
    } catch {}
  }

  async getHistory(userId, page = 1, routeFilter = '') {
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (routeFilter) params.append('route', routeFilter);
      const { data } = await api.get(`/api/journeys/user/${userId}?${params}`);
      return data;
    } catch {
      return { journeys: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  isOngoing() { return !!this.currentJourney; }
  getCurrent() { return this.currentJourney; }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _notify() {
    this.listeners.forEach(fn => fn(this.currentJourney));
  }
}

const journeyTracker = new JourneyTracker();
export default journeyTracker;
