const mongoose = require('mongoose');

const peerSchema = new mongoose.Schema({
  peerId: { type: String, required: true, unique: true },
  userId: { type: String },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  networkStrength: { type: String, enum: ['strong', 'weak', 'offline'], default: 'strong' },
  lastSeen: { type: Date, default: Date.now },
  violations: { type: Number, default: 0 },
  blacklisted: { type: Boolean, default: false }
});

peerSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model('Peer', peerSchema);
