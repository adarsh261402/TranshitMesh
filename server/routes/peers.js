const express = require('express');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { peerId, lat, lng, networkStrength, userId } = req.body;
    if (!peerId || lat === undefined || lng === undefined) return res.status(400).json({ error: 'peerId, lat, lng required' });
    global.activePeers.set(peerId, { peerId, lat, lng, networkStrength: networkStrength || 'strong', lastSeen: Date.now() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/nearby', (req, res) => {
  const { lat, lng, radius } = req.query;
  const uLat = parseFloat(lat); const uLng = parseFloat(lng); const rKm = parseFloat(radius || 500) / 1000;
  const peers = [];
  global.activePeers.forEach(p => {
    if (Date.now() - p.lastSeen > 120000 || p.networkStrength !== 'strong') return;
    const dLat = (p.lat - uLat) * Math.PI / 180; const dLng = (p.lng - uLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(uLat * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (d <= rKm) peers.push({ ...p, distance: Math.round(d * 1000) });
  });
  peers.sort((a, b) => a.distance - b.distance);
  res.json(peers.slice(0, 10));
});

router.delete('/:id', (req, res) => {
  global.activePeers.delete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
