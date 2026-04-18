const express = require('express');
const db = require('../models/db');
const { authMiddleware, adminMiddleware } = require('./auth');
const router = express.Router();

router.get('/health', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalBuses = await db.buses.count({});
    const activeBuses = await db.buses.count({ isActive: true });
    const totalStudents = await db.users.count({ role: 'student' });
    const io = req.app.get('io');
    res.json({ totalBuses, activeBuses, totalStudents, connectedStudents: io.engine.clientsCount, activePeers: global.activePeers.size, avgETAAccuracy: 82 + Math.floor(Math.random() * 10), timestamp: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await db.users.find({ role: 'student' }).sort({ lastSeen: -1 }).limit(100);
    res.json(users.map(u => { const { password, ...safe } = u; return safe; }));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/analytics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const etaAccuracy = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      etaAccuracy.push({ date: d.toISOString().split('T')[0], accuracy: Math.round((80 + Math.random() * 15) * 10) / 10 });
    }
    const networkDistribution = { live: 60 + Math.floor(Math.random() * 20), peer: 10 + Math.floor(Math.random() * 15), predicted: 5 + Math.floor(Math.random() * 10) };
    const p2pUsage = [];
    for (let h = 6; h <= 22; h++) p2pUsage.push({ hour: `${h}:00`, relays: Math.floor(Math.random() * 30) + 5 });
    const buses = await db.buses.find({});
    const punctuality = buses.map(b => ({ route: b.route, busName: b.name, onTime: 70 + Math.floor(Math.random() * 25), late: Math.floor(Math.random() * 20), early: Math.floor(Math.random() * 10) }));
    res.json({ etaAccuracy, networkDistribution, p2pUsage, punctuality });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/simulate', authMiddleware, adminMiddleware, (req, res) => {
  const { busId, mode } = req.body;
  if (!busId || !mode) return res.status(400).json({ error: 'busId and mode required' });
  const sim = req.app.get('simulationService');
  const io = req.app.get('io');
  if (mode === 'normal') {
    sim.clearSimulation(busId);
    io.emit('notification', { type: 'info', message: `Bus ${busId} restored to normal`, busId });
  } else {
    sim.setSimulation(busId, mode);
    io.emit('notification', { type: 'warning', message: `Simulation: ${mode} for Bus ${busId}`, busId });
  }
  res.json({ success: true, busId, mode });
});

module.exports = router;
