const express = require('express');
const db = require('../models/db');
const { authMiddleware, adminMiddleware } = require('./auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try { res.json(await db.buses.find({ isActive: true })); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  try { res.json(await db.buses.find({})); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const bus = await db.buses.findOne({ busId: req.params.id });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    const history = await db.positions.find({ busId: req.params.id }).sort({ timestamp: -1 }).limit(50);
    res.json({ bus, history });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { busId, name, route, stops, isActive } = req.body;
    if (!busId || !name || !route) return res.status(400).json({ error: 'busId, name, route required' });
    const existing = await db.buses.findOne({ busId });
    if (existing) return res.status(400).json({ error: 'Bus ID exists' });
    const bus = await db.buses.insert({
      busId, name, route, stops: stops || [], isActive: isActive !== false,
      currentLat: stops?.[0]?.lat || 0, currentLng: stops?.[0]?.lng || 0,
      speed: 0, heading: 0, lastUpdated: new Date().toISOString(),
      currentStopIndex: 0, routeProgress: 0, direction: 1, passengerCount: 0, capacity: 50
    });
    req.app.get('io').emit('bus:update', { busId: bus.busId, name: bus.name, route: bus.route, lat: bus.currentLat, lng: bus.currentLng, speed: 0, heading: 0, timestamp: new Date().toISOString(), isActive: bus.isActive });
    res.status(201).json(bus);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const bus = await db.buses.findOne({ busId: req.params.id });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.route) updates.route = req.body.route;
    if (req.body.stops) updates.stops = req.body.stops;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    await db.buses.update({ busId: req.params.id }, { $set: updates });
    res.json({ ...bus, ...updates });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const n = await db.buses.remove({ busId: req.params.id }, {});
    if (!n) return res.status(404).json({ error: 'Bus not found' });
    await db.positions.remove({ busId: req.params.id }, { multi: true });
    res.json({ message: 'Bus deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/position', async (req, res) => {
  try {
    const { lat, lng, speed, heading } = req.body;
    const bus = await db.buses.findOne({ busId: req.params.id });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    await db.buses.update({ busId: req.params.id }, { $set: { currentLat: lat, currentLng: lng, speed: speed || bus.speed, heading: heading || bus.heading, lastUpdated: new Date().toISOString() } });
    await db.positions.insert({ busId: bus.busId, lat, lng, speed, heading, timestamp: new Date().toISOString() });
    req.app.get('io').emit('bus:update', { busId: bus.busId, name: bus.name, route: bus.route, lat, lng, speed: speed || bus.speed, heading: heading || bus.heading, timestamp: new Date().toISOString(), isActive: bus.isActive });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
