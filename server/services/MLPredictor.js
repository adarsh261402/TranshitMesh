const ArrivalRecord = require('../models/ArrivalRecord');

class MLPredictor {
  constructor() {
    this.models = new Map(); // Cache trained models per bus-stop pair
  }

  /**
   * Calculate distance between two lat/lng points in km (Haversine)
   */
  haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Predict ETA using linear regression on historical data
   */
  async predictETA(bus, stop) {
    try {
      const distance = this.haversineDistance(
        bus.currentLat, bus.currentLng,
        stop.lat, stop.lng
      );

      // Base ETA from speed and distance
      const speedKmh = Math.max(bus.speed || 15, 5); // minimum 5 km/h
      let baseEtaMinutes = (distance / speedKmh) * 60;

      // Get historical data for this bus-stop pair
      const historicalRecords = await ArrivalRecord.find({
        busId: bus.busId,
        stopName: stop.name
      }).sort({ actualArrivalTime: -1 }).limit(50);

      let confidence = 85;
      let source = 'schedule';

      if (historicalRecords.length >= 5) {
        // Use simple linear regression approach
        // Features: hour of day, day of week → average delay
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();

        // Calculate average delay for similar time periods
        const similarRecords = historicalRecords.filter(r => {
          const recHour = new Date(r.actualArrivalTime).getHours();
          const recDay = new Date(r.actualArrivalTime).getDay();
          return Math.abs(recHour - currentHour) <= 2;
        });

        if (similarRecords.length >= 3) {
          const avgDelay = similarRecords.reduce((sum, r) => sum + (r.delayMinutes || 0), 0) / similarRecords.length;

          // Weighted regression: combine base ETA with historical delay
          const weights = similarRecords.map((r, i) => 1 / (i + 1)); // More recent = higher weight
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          const weightedDelay = similarRecords.reduce((sum, r, i) =>
            sum + (r.delayMinutes || 0) * weights[i], 0) / totalWeight;

          baseEtaMinutes += weightedDelay;
          confidence = Math.min(95, 70 + Math.min(similarRecords.length * 3, 25));
          source = 'ml_model';
        } else {
          // Use overall average delay
          const avgDelay = historicalRecords.reduce((sum, r) => sum + (r.delayMinutes || 0), 0) / historicalRecords.length;
          baseEtaMinutes += avgDelay * 0.5;
          confidence = 65;
          source = 'schedule';
        }
      } else {
        // Not enough historical data — use dead reckoning
        confidence = 50 + Math.min(distance * 5, 30);
        source = 'dead_reckoning';
      }

      // Ensure ETA is reasonable
      baseEtaMinutes = Math.max(0.5, Math.round(baseEtaMinutes * 10) / 10);

      // Confidence adjustments
      const dataAge = (Date.now() - new Date(bus.lastUpdated).getTime()) / 1000;
      if (dataAge > 60) confidence -= 15;
      if (dataAge > 120) confidence -= 20;
      confidence = Math.max(10, Math.min(100, Math.round(confidence)));

      return {
        etaMinutes: Math.round(baseEtaMinutes),
        confidence,
        source,
        distance: Math.round(distance * 1000), // meters
        busSpeed: speedKmh,
        stopName: stop.name,
        lastUpdated: bus.lastUpdated
      };
    } catch (err) {
      console.error('ML prediction error:', err);
      // Fallback prediction
      const distance = this.haversineDistance(bus.currentLat, bus.currentLng, stop.lat, stop.lng);
      const eta = Math.max(1, Math.round((distance / 20) * 60));
      return {
        etaMinutes: eta,
        confidence: 30,
        source: 'dead_reckoning',
        distance: Math.round(distance * 1000),
        busSpeed: bus.speed || 20,
        stopName: stop.name,
        lastUpdated: bus.lastUpdated
      };
    }
  }
}

module.exports = MLPredictor;
