const mongoose = require('mongoose');

const positionHistorySchema = new mongoose.Schema({
  busId: { type: String, required: true, index: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true },
  source: { type: String, enum: ['gps', 'peer', 'predicted'], default: 'gps' }
});

positionHistorySchema.index({ busId: 1, timestamp: -1 });

module.exports = mongoose.model('PositionHistory', positionHistorySchema);
