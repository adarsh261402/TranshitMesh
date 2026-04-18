const express = require('express');
const ValidationService = require('../services/ValidationService');

const router = express.Router();
const validationService = new ValidationService();

// POST /api/validate/position — Cross-validate position from multiple peers
router.post('/position', async (req, res) => {
  try {
    const { busId, lat, lng, peerId, timestamp } = req.body;
    if (!busId || lat === undefined || lng === undefined || !peerId) {
      return res.status(400).json({ error: 'busId, lat, lng, peerId required' });
    }

    const result = validationService.validatePosition(busId, lat, lng, peerId, timestamp);
    res.json(result);
  } catch (err) {
    console.error('Validation error:', err);
    res.status(500).json({ error: 'Validation failed' });
  }
});

module.exports = router;
