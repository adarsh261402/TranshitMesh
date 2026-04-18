const express = require('express');
const db = require('../models/db');
const router = express.Router();

router.post('/bulk', async (req, res) => {
  try {
    const { entries } = req.body;
    if (!entries || !Array.isArray(entries)) return res.status(400).json({ error: 'entries array required' });
    let synced = 0;
    const io = req.app.get('io');
    for (const e of entries) {
      if (!e.busId || e.lat === undefined || e.lng === undefined) continue;
      await db.positions.insert({ busId: e.busId, lat: e.lat, lng: e.lng, speed: e.speed || 0, heading: e.heading || 0, timestamp: e.timestamp || new Date().toISOString(), source: 'gps' });
      const bus = await db.buses.findOne({ busId: e.busId });
      if (bus) {
        await db.buses.update({ busId: e.busId }, { $set: { currentLat: e.lat, currentLng: e.lng, speed: e.speed || bus.speed, lastUpdated: new Date().toISOString() } });
        io.emit('bus:update', { busId: e.busId, name: bus.name, route: bus.route, lat: e.lat, lng: e.lng, speed: e.speed || bus.speed, heading: e.heading || bus.heading, timestamp: new Date().toISOString(), isActive: bus.isActive });
      }
      synced++;
    }
    res.json({ success: true, synced, total: entries.length });
  } catch (err) { res.status(500).json({ error: 'Sync failed' }); }
});

module.exports = router;
