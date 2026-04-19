const express = require('express');
const db = require('../models/db');
const router = express.Router();

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTrafficMultiplier(hour) {
  if (hour >= 8 && hour <= 9) return 1.6;
  if (hour >= 17 && hour <= 19) return 1.5;
  if (hour >= 12 && hour <= 13) return 1.2;
  return 1.0;
}

function getTrafficCondition(mult) {
  if (mult >= 1.5) return 'heavy';
  if (mult >= 1.2) return 'moderate';
  return 'clear';
}

// GET /api/eta/:busId — returns ETA for ALL stops at once
router.get('/:busId', async (req, res) => {
  try {
    const bus = await db.buses.findOne({ busId: req.params.busId });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });

    const stops = (bus.stops || []).sort((a, b) => a.order - b.order);
    if (stops.length === 0) return res.json({ busId: bus.busId, stops: [] });

    const { currentLat, currentLng, speed } = bus;
    const busSpeed = Math.max(speed || 15, 5); // min 5 km/h
    const speedKmPerMin = busSpeed / 60;
    const hour = new Date().getHours();
    const trafficMult = getTrafficMultiplier(hour);
    const trafficCondition = getTrafficCondition(trafficMult);

    // Find nearest stop index
    let nearestIdx = 0, minDist = Infinity;
    stops.forEach((stop, i) => {
      const d = haversineKm(currentLat, currentLng, stop.lat, stop.lng);
      if (d < minDist) { minDist = d; nearestIdx = i; }
    });

    const distToBusFromNearest = haversineKm(currentLat, currentLng, stops[nearestIdx].lat, stops[nearestIdx].lng);
    const dir = bus.direction || 1;

    const etaStops = stops.map((stop, i) => {
      const isPassed = dir > 0 ? i < nearestIdx : i > nearestIdx;

      if (isPassed) {
        return { stopName: stop.name, order: stop.order, etaMinutes: null, passed: true, isNext: false, confidence: 0, trafficCondition, distanceKm: 0 };
      }

      // Remaining distance along route
      let remainingDist;
      if (stop.cumulativeDistanceKm !== undefined && stops[nearestIdx].cumulativeDistanceKm !== undefined) {
        remainingDist = Math.abs(stop.cumulativeDistanceKm - stops[nearestIdx].cumulativeDistanceKm) + distToBusFromNearest;
      } else {
        remainingDist = haversineKm(currentLat, currentLng, stop.lat, stop.lng);
      }

      const rawETA = remainingDist / speedKmPerMin;
      const etaMinutes = busSpeed <= 1 ? null : Math.max(1, Math.round(rawETA * trafficMult));
      const confidence = busSpeed > 1 ? Math.min(95, 88 - ((i - nearestIdx) * 3)) : 40;

      return {
        stopName: stop.name,
        order: stop.order,
        etaMinutes,
        distanceKm: Math.round(remainingDist * 1000) / 1000,
        passed: false,
        isNext: i === nearestIdx,
        confidence: Math.max(10, confidence),
        trafficCondition,
      };
    });

    res.json({
      busId: bus.busId,
      busName: bus.name,
      busNumber: bus.busNumber,
      currentSpeed: busSpeed,
      lastUpdated: bus.lastUpdated,
      stops: etaStops,
    });
  } catch (err) {
    console.error('ETA error:', err);
    res.status(500).json({ error: 'ETA calculation failed' });
  }
});

module.exports = router;
