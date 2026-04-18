const express = require('express');
const db = require('../models/db');
const router = express.Router();

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get('/:busId/:stopId', async (req, res) => {
  try {
    const bus = await db.buses.findOne({ busId: req.params.busId });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    const stop = (bus.stops || []).find(s => s._id === req.params.stopId || s.name === req.params.stopId);
    if (!stop) return res.status(404).json({ error: 'Stop not found' });

    const dist = haversine(bus.currentLat, bus.currentLng, stop.lat, stop.lng);
    const speed = Math.max(bus.speed || 15, 5);
    let eta = (dist / speed) * 60;

    const records = await db.arrivals.find({ busId: bus.busId, stopName: stop.name }).sort({ actualArrivalTime: -1 }).limit(30);
    let confidence = 50, source = 'dead_reckoning';
    if (records.length >= 5) {
      const avgDelay = records.reduce((s, r) => s + (r.delayMinutes || 0), 0) / records.length;
      eta += avgDelay * 0.5;
      confidence = Math.min(95, 65 + records.length * 2);
      source = 'ml_model';
    } else if (records.length > 0) {
      confidence = 60; source = 'schedule';
    }
    eta = Math.max(0.5, Math.round(eta * 10) / 10);
    const age = (Date.now() - new Date(bus.lastUpdated).getTime()) / 1000;
    if (age > 60) confidence -= 15;
    confidence = Math.max(10, Math.min(100, Math.round(confidence)));

    res.json({ etaMinutes: Math.round(eta), confidence, source, distance: Math.round(dist * 1000), busSpeed: speed, stopName: stop.name, lastUpdated: bus.lastUpdated });
  } catch (err) { res.status(500).json({ error: 'Prediction failed' }); }
});

router.get('/:busId', async (req, res) => {
  try {
    const bus = await db.buses.findOne({ busId: req.params.busId });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    const etas = [];
    for (const stop of (bus.stops || [])) {
      const dist = haversine(bus.currentLat, bus.currentLng, stop.lat, stop.lng);
      const speed = Math.max(bus.speed || 15, 5);
      let eta = (dist / speed) * 60;
      const records = await db.arrivals.find({ busId: bus.busId, stopName: stop.name }).sort({ actualArrivalTime: -1 }).limit(10);
      let confidence = 50, source = 'dead_reckoning';
      if (records.length >= 3) { const ad = records.reduce((s, r) => s + (r.delayMinutes || 0), 0) / records.length; eta += ad * 0.3; confidence = Math.min(92, 60 + records.length * 3); source = 'ml_model'; }
      eta = Math.max(0.5, Math.round(eta * 10) / 10);
      const age = (Date.now() - new Date(bus.lastUpdated).getTime()) / 1000;
      if (age > 60) confidence -= 15;
      confidence = Math.max(10, Math.min(100, Math.round(confidence)));
      etas.push({ etaMinutes: Math.round(eta), confidence, source, stopName: stop.name, stopId: stop._id || stop.name, distance: Math.round(dist * 1000) });
    }
    res.json(etas);
  } catch (err) { res.status(500).json({ error: 'Prediction failed' }); }
});

module.exports = router;
