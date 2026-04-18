const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  order: { type: Number, required: true }
}, { _id: true });

const busSchema = new mongoose.Schema({
  busId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  route: { type: String, required: true },
  stops: [stopSchema],
  currentLat: { type: Number, default: 0 },
  currentLng: { type: Number, default: 0 },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  currentStopIndex: { type: Number, default: 0 },
  routeProgress: { type: Number, default: 0 },
  direction: { type: Number, default: 1 },
  passengerCount: { type: Number, default: 0 },
  capacity: { type: Number, default: 50 }
});

module.exports = mongoose.model('Bus', busSchema);
