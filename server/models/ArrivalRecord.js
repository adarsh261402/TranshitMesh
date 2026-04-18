const mongoose = require('mongoose');

const arrivalRecordSchema = new mongoose.Schema({
  busId: { type: String, required: true, index: true },
  stopId: { type: String, required: true },
  stopName: { type: String },
  scheduledTime: { type: Date },
  actualArrivalTime: { type: Date, required: true },
  dayOfWeek: { type: Number, min: 0, max: 6 },
  delayMinutes: { type: Number, default: 0 },
  speed: { type: Number },
  passengerLoad: { type: Number, default: 0 },
  weather: { type: String, enum: ['clear', 'rain', 'heavy_rain', 'fog'], default: 'clear' }
});

arrivalRecordSchema.index({ busId: 1, stopId: 1, actualArrivalTime: -1 });

module.exports = mongoose.model('ArrivalRecord', arrivalRecordSchema);
