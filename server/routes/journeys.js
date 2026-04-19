const express = require('express');
const db = require('../models/db');
const { authMiddleware } = require('./auth');
const router = express.Router();

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST /api/journeys/start — start a new journey
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { busId, busName, routeName, routeLabel, boardingStop } = req.body;
    if (!busId || !boardingStop || !boardingStop.name) {
      return res.status(400).json({ error: 'busId and boardingStop required' });
    }
    // Check for existing ongoing journey
    const ongoing = await db.journeys.findOne({ userId: req.user.id, status: 'ongoing' });
    if (ongoing) return res.status(400).json({ error: 'You already have an ongoing journey', journey: ongoing });

    const journey = await db.journeys.insert({
      userId: req.user.id,
      busId,
      busName: busName || busId,
      routeName: routeName || '',
      routeLabel: routeLabel || '',
      boardingStop: {
        name: boardingStop.name,
        lat: boardingStop.lat || 0,
        lng: boardingStop.lng || 0
      },
      dropOffStop: null,
      boardingTime: new Date().toISOString(),
      dropOffTime: null,
      durationMinutes: 0,
      distanceKm: 0,
      status: 'ongoing'
    });
    res.status(201).json(journey);
  } catch (err) {
    console.error('Journey start error:', err);
    res.status(500).json({ error: 'Failed to start journey' });
  }
});

// PATCH /api/journeys/:id/end — end a journey
router.patch('/:id/end', authMiddleware, async (req, res) => {
  try {
    const journey = await db.journeys.findOne({ _id: req.params.id, userId: req.user.id });
    if (!journey) return res.status(404).json({ error: 'Journey not found' });
    if (journey.status !== 'ongoing') return res.status(400).json({ error: 'Journey is not ongoing' });

    const { dropOffStop } = req.body;
    const dropOffTime = new Date().toISOString();
    const boardingTime = new Date(journey.boardingTime);
    const durationMinutes = Math.round((new Date(dropOffTime) - boardingTime) / 60000);

    let distanceKm = 0;
    if (dropOffStop && dropOffStop.lat && journey.boardingStop.lat) {
      // Calculate distance between boarding and drop-off
      const bus = await db.buses.findOne({ busId: journey.busId });
      if (bus && bus.stops) {
        const boardIdx = bus.stops.findIndex(s => s.name === journey.boardingStop.name);
        const dropIdx = bus.stops.findIndex(s => s.name === dropOffStop.name);
        if (boardIdx >= 0 && dropIdx >= 0 && bus.stops[dropIdx].cumulativeDistanceKm !== undefined) {
          distanceKm = Math.abs(bus.stops[dropIdx].cumulativeDistanceKm - bus.stops[boardIdx].cumulativeDistanceKm);
        } else {
          distanceKm = haversineKm(journey.boardingStop.lat, journey.boardingStop.lng, dropOffStop.lat, dropOffStop.lng);
        }
      } else {
        distanceKm = haversineKm(journey.boardingStop.lat, journey.boardingStop.lng, dropOffStop.lat, dropOffStop.lng);
      }
    }
    distanceKm = Math.round(distanceKm * 100) / 100;

    await db.journeys.update({ _id: req.params.id }, {
      $set: {
        dropOffStop: dropOffStop ? { name: dropOffStop.name, lat: dropOffStop.lat || 0, lng: dropOffStop.lng || 0 } : null,
        dropOffTime,
        durationMinutes,
        distanceKm,
        status: 'completed'
      }
    });

    const updated = await db.journeys.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (err) {
    console.error('Journey end error:', err);
    res.status(500).json({ error: 'Failed to end journey' });
  }
});

// GET /api/journeys/user/:userId — get all journeys for a user
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const routeFilter = req.query.route || '';

    let query = { userId: req.params.userId };
    if (routeFilter) query.routeName = routeFilter;

    const total = await db.journeys.count(query);
    const journeys = await db.journeys.find(query)
      .sort({ boardingTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ journeys, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch journeys' });
  }
});

// GET /api/journeys/ongoing — get current ongoing journey
router.get('/ongoing', authMiddleware, async (req, res) => {
  try {
    const journey = await db.journeys.findOne({ userId: req.user.id, status: 'ongoing' });
    res.json({ journey: journey || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ongoing journey' });
  }
});

// GET /api/journeys/:id — single journey detail
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const journey = await db.journeys.findOne({ _id: req.params.id });
    if (!journey) return res.status(404).json({ error: 'Journey not found' });
    res.json(journey);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch journey' });
  }
});

// PATCH /api/journeys/:id/cancel — cancel journey
router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    await db.journeys.update({ _id: req.params.id, userId: req.user.id }, { $set: { status: 'cancelled' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel journey' });
  }
});

module.exports = router;
