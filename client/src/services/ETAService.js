const API = 'http://localhost:5000/api';

const ETAService = {
  async getETA(busId, stopId) {
    try {
      const resp = await fetch(`${API}/eta/${busId}/${stopId}`);
      if (!resp.ok) throw new Error('ETA fetch failed');
      return await resp.json();
    } catch (err) {
      return { etaMinutes: null, confidence: 0, source: 'unavailable' };
    }
  },

  async getAllETAs(busId) {
    try {
      const resp = await fetch(`${API}/eta/${busId}`);
      if (!resp.ok) throw new Error('ETA fetch failed');
      return await resp.json();
    } catch (err) {
      return [];
    }
  },

  getConfidenceColor(confidence) {
    if (confidence >= 71) return 'high';
    if (confidence >= 41) return 'medium';
    return 'low';
  },

  getConfidenceClass(confidence) {
    if (confidence >= 71) return 'confidence-high';
    if (confidence >= 41) return 'confidence-medium';
    return 'confidence-low';
  },

  formatETA(minutes) {
    if (minutes === null || minutes === undefined) return 'N/A';
    if (minutes < 1) return '< 1 min';
    if (minutes === 1) return '~1 min';
    return `~${Math.round(minutes)} min`;
  }
};

export default ETAService;
