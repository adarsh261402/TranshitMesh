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
  if (hour >= 8 && hour <= 9) return 1.6;   // morning rush
  if (hour >= 17 && hour <= 19) return 1.5;  // evening rush
  if (hour >= 12 && hour <= 13) return 1.2;  // lunch
  return 1.0;
}

function getTrafficCondition(hour) {
  if (hour >= 8 && hour <= 9) return 'heavy';
  if (hour >= 17 && hour <= 19) return 'heavy';
  if (hour >= 12 && hour <= 13) return 'moderate';
  return 'light';
}

function findNearestStopIndex(busLat, busLng, stops) {
  let minDist = Infinity, idx = 0;
  for (let i = 0; i < stops.length; i++) {
    const d = haversineKm(busLat, busLng, stops[i].lat, stops[i].lng);
    if (d < minDist) { minDist = d; idx = i; }
  }
  return { index: idx, distance: minDist };
}

// GET /api/eta/:busId — get ETAs for ALL stops (per-stop, unique values)
router.get('/:busId', async (req, res) => {
  try {
    const bus = await db.buses.findOne({ busId: req.params.busId });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });

    const stops = (bus.stops || []).sort((a, b) => a.order - b.order);
    if (stops.length === 0) return res.json([]);

    const { index: nearestIdx, distance: distToNearest } = findNearestStopIndex(bus.currentLat, bus.currentLng, stops);
    const busSpeed = Math.max(bus.speed || 15, 5); // km/h, minimum 5
    const speedKmPerMin = busSpeed / 60;
    const currentHour = new Date().getHours();
    const trafficMult = getTrafficMultiplier(currentHour);
    const trafficCondition = getTrafficCondition(currentHour);

    // Determine direction: if bus is past a stop, it's already been visited
    const direction = bus.direction || 1;

    // Get historical records for confidence boost
    const arrivalRecords = await db.arrivals.find({ busId: bus.busId }).sort({ actualArrivalTime: -1 }).limit(50);
    const arrivalsByStop = {};
    arrivalRecords.forEach(r => {
      if (!arrivalsByStop[r.stopName]) arrivalsByStop[r.stopName] = [];
      arrivalsByStop[r.stopName].push(r);
    });

    const etas = stops.map((stop, i) => {
      const isPassed = direction > 0 ? i < nearestIdx : i > nearestIdx;

      // Cumulative distance-based calculation
      let remainingDist;
      if (stop.cumulativeDistanceKm !== undefined && stops[nearestIdx].cumulativeDistanceKm !== undefined) {
        remainingDist = Math.abs(stop.cumulativeDistanceKm - stops[nearestIdx].cumulativeDistanceKm);
        // Add the gap from bus position to nearest stop
        if (i === nearestIdx) remainingDist = distToNearest;
        else remainingDist += distToNearest * (i > nearestIdx ? 1 : 0);
      } else {
        remainingDist = haversineKm(bus.currentLat, bus.currentLng, stop.lat, stop.lng);
      }

      let etaMinutes;
      if (isPassed) {
        etaMinutes = 0; // already passed
      } else if (i === nearestIdx) {
        etaMinutes = Math.max(0.5, (distToNearest / speedKmPerMin) * trafficMult);
      } else {
        etaMinutes = Math.max(0.5, (remainingDist / speedKmPerMin) * trafficMult);
      }

      // Apply historical delay adjustment
      let confidence = 50, source = 'realtime_calc';
      const stopRecords = arrivalsByStop[stop.name] || [];
      if (stopRecords.length >= 5) {
        const avgDelay = stopRecords.reduce((s, r) => s + (r.delayMinutes || 0), 0) / stopRecords.length;
        etaMinutes += avgDelay * 0.3;
        confidence = Math.min(95, 65 + stopRecords.length);
        source = 'ml_model';
      } else if (stopRecords.length > 0) {
        confidence = 58;
        source = 'realtime_calc';
      }

      // Data age penalty
      const dataAge = (Date.now() - new Date(bus.lastUpdated).getTime()) / 1000;
      if (dataAge > 60) { confidence -= 15; source = 'dead_reckoning'; }
      confidence = Math.max(10, Math.min(100, Math.round(confidence)));
      etaMinutes = Math.max(0, Math.round(etaMinutes * 10) / 10);

      return {
        stopId: stop._id || `stop_${i}`,
        stopName: stop.name,
        stopOrder: stop.order,
        etaMinutes: isPassed ? 0 : Math.round(etaMinutes),
        distanceKm: Math.round(remainingDist * 1000) / 1000,
        confidence,
        trafficCondition,
        source,
        isPassed,
        isNext: i === nearestIdx + (direction > 0 ? 1 : -1) || (i === nearestIdx && distToNearest > 0.02)
      };
    });

    res.json(etas);
  } catch (err) {
    console.error('ETA error:', err);
    res.status(500).json({ error: 'Prediction failed' });
  }
});

// GET /api/eta/:busId/:stopId — single stop ETA
router.get('/:busId/:stopId', async (req, res) => {
  try {
    const bus = await db.buses.findOne({ busId: req.params.busId });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });

    const stops = (bus.stops || []).sort((a, b) => a.order - b.order);
    const stop = stops.find(s => s.name === req.params.stopId || s._id === req.params.stopId);
    if (!stop) return res.status(404).json({ error: 'Stop not found' });

    const { index: nearestIdx, distance: distToNearest } = findNearestStopIndex(bus.currentLat, bus.currentLng, stops);
    const stopIdx = stops.indexOf(stop);
    const busSpeed = Math.max(bus.speed || 15, 5);
    const speedKmPerMin = busSpeed / 60;
    const currentHour = new Date().getHours();
    const trafficMult = getTrafficMultiplier(currentHour);

    let remainingDist;
    if (stop.cumulativeDistanceKm !== undefined && stops[nearestIdx].cumulativeDistanceKm !== undefined) {
      remainingDist = Math.abs(stop.cumulativeDistanceKm - stops[nearestIdx].cumulativeDistanceKm) + distToNearest;
    } else {
      remainingDist = haversineKm(bus.currentLat, bus.currentLng, stop.lat, stop.lng);
    }

    let etaMinutes = (remainingDist / speedKmPerMin) * trafficMult;

    const records = await db.arrivals.find({ busId: bus.busId, stopName: stop.name }).sort({ actualArrivalTime: -1 }).limit(30);
    let confidence = 50, source = 'realtime_calc';
    if (records.length >= 5) {
      const avgDelay = records.reduce((s, r) => s + (r.delayMinutes || 0), 0) / records.length;
      etaMinutes += avgDelay * 0.3;
      confidence = Math.min(95, 65 + records.length * 2);
      source = 'ml_model';
    }

    const dataAge = (Date.now() - new Date(bus.lastUpdated).getTime()) / 1000;
    if (dataAge > 60) confidence -= 15;
    confidence = Math.max(10, Math.min(100, Math.round(confidence)));
    etaMinutes = Math.max(0.5, Math.round(etaMinutes * 10) / 10);

    res.json({
      stopId: stop._id || stop.name,
      stopName: stop.name,
      etaMinutes: Math.round(etaMinutes),
      distanceKm: Math.round(remainingDist * 1000) / 1000,
      confidence,
      trafficCondition: getTrafficCondition(currentHour),
      source,
      busSpeed,
      lastUpdated: bus.lastUpdated
    });
  } catch (err) {
    res.status(500).json({ error: 'Prediction failed' });
  }
});

module.exports = router;
