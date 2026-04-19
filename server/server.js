const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const { Server: SocketServer } = require('socket.io');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '.data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = require('./models/db');
const authRoutes = require('./routes/auth');
const busRoutes = require('./routes/buses');
const etaRoutes = require('./routes/eta');
const peerRoutes = require('./routes/peers');
const syncRoutes = require('./routes/sync');
const validateRoutes = require('./routes/validate');
const adminRoutes = require('./routes/admin');
const journeyRoutes = require('./routes/journeys');
const setupSocket = require('./socket/index');
const SimulationService = require('./services/SimulationService');

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], credentials: true } });

// ═══════════ GLOBAL SIMULATION STATE ═══════════
const simulationState = {};
// Shape: { [busId]: { mode: 'normal'|'weak'|'offline'|'gps_gap', startedAt: Date } }
global.simulationState = simulationState;

app.use(compression());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.set('io', io);
app.set('db', db);
app.set('simulationState', simulationState);

app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/eta', etaRoutes);
app.use('/api/peers', peerRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/validate', validateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/journeys', journeyRoutes);

// ═══════════ SIMULATION ENDPOINT ═══════════
const { authMiddleware, adminMiddleware } = require('./routes/auth');
app.post('/api/admin/simulate', authMiddleware, adminMiddleware, (req, res) => {
  const { busId, mode } = req.body;
  if (!busId || !mode) return res.status(400).json({ error: 'busId and mode required' });
  if (mode === 'normal') {
    delete simulationState[busId];
  } else {
    simulationState[busId] = { mode, startedAt: new Date() };
  }
  io.emit('simulation:changed', { busId, mode, startedAt: simulationState[busId]?.startedAt });
  res.json({ success: true, busId, mode });
});

app.get('/api/admin/simulate', (req, res) => {
  res.json(simulationState);
});

// ═══════════ ROUTE BUSES ENDPOINT ═══════════
app.get('/api/routes/:routeId/buses', async (req, res) => {
  try {
    const buses = await db.buses.find({ route: req.params.routeId, isActive: true });
    res.json(buses.map(b => ({
      busId: b.busId, name: b.name, busNumber: b.busNumber, route: b.route, routeLabel: b.routeLabel,
      routeColor: b.routeColor, lat: b.currentLat, lng: b.currentLng, speed: b.speed,
      heading: b.heading, isActive: b.isActive, stops: b.stops, routePolyline: b.routePolyline,
      scheduledDepartureTime: b.scheduledDepartureTime, actualDepartureTime: b.actualDepartureTime,
      delayMinutes: b.delayMinutes, isDelayed: b.isDelayed, frequency: b.frequency,
      lastUpdated: b.lastUpdated, passengerCount: b.passengerCount, capacity: b.capacity,
    })));
  } catch { res.status(500).json({ error: 'Failed to fetch route buses' }); }
});

app.get('/api/health', (req, res) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }); });

setupSocket(io);
const simulationService = new SimulationService(io);
app.set('simulationService', simulationService);
global.activePeers = new Map();

// ═══════════ HAVERSINE ═══════════
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ═══════════ BUS SIMULATION ═══════════
const busUpdateTimers = {};

function shouldSuppressUpdate(busId) {
  const sim = simulationState[busId];
  if (!sim) return false;
  if (sim.mode === 'offline') return true;
  if (sim.mode === 'gps_gap') return (Date.now() - new Date(sim.startedAt).getTime()) < 30000;
  return false;
}

function shouldSlowUpdate(busId) {
  const sim = simulationState[busId];
  return sim && sim.mode === 'weak';
}

function startBusSimulation() {
  setInterval(async () => {
    try {
      const buses = await db.buses.find({ isActive: true });
      for (const bus of buses) {
        // Check simulation suppression
        if (shouldSuppressUpdate(bus.busId)) continue;

        // Weak mode: only update every 4th tick (~12s instead of 3s)
        if (shouldSlowUpdate(bus.busId)) {
          if (!busUpdateTimers[bus.busId]) busUpdateTimers[bus.busId] = 0;
          busUpdateTimers[bus.busId]++;
          if (busUpdateTimers[bus.busId] % 4 !== 0) continue;
        }

        const stops = (bus.stops || []).sort((a, b) => a.order - b.order);
        if (stops.length < 2) continue;

        let idx = bus.currentStopIndex || 0;
        let progress = bus.routeProgress || 0;
        let dir = bus.direction || 1;

        progress += 0.02 + Math.random() * 0.03;
        if (progress >= 1) {
          progress = 0;
          idx += dir;
          if (idx >= stops.length - 1) { dir = -1; idx = stops.length - 1; }
          else if (idx <= 0) { dir = 1; idx = 0; }
        }

        const from = stops[Math.max(0, Math.min(idx, stops.length - 1))];
        const toIdx = Math.max(0, Math.min(idx + dir, stops.length - 1));
        const to = stops[toIdx];

        const lat = from.lat + (to.lat - from.lat) * progress;
        const lng = from.lng + (to.lng - from.lng) * progress;
        const heading = Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180 / Math.PI;
        const speed = Math.round((15 + Math.random() * 25) * 10) / 10;

        await db.buses.update({ busId: bus.busId }, {
          $set: { currentLat: lat, currentLng: lng, speed, heading, lastUpdated: new Date().toISOString(), currentStopIndex: idx, routeProgress: progress, direction: dir }
        });

        await db.positions.insert({ busId: bus.busId, lat, lng, speed, heading, timestamp: new Date().toISOString(), source: 'gps' });

        const updateData = {
          busId: bus.busId, name: bus.name, busNumber: bus.busNumber,
          route: bus.route, routeLabel: bus.routeLabel, routeColor: bus.routeColor,
          routePolyline: bus.routePolyline, stops: bus.stops,
          lat, lng, speed, heading, timestamp: new Date().toISOString(), isActive: true,
          delayMinutes: bus.delayMinutes, isDelayed: bus.isDelayed,
          scheduledDepartureTime: bus.scheduledDepartureTime,
        };

        io.emit('bus:update', updateData);
      }

      const activeBuses = await db.buses.count({ isActive: true });
      io.emit('system:health', { activeBuses, connectedUsers: io.engine.clientsCount, peerCount: global.activePeers.size, timestamp: new Date().toISOString() });
    } catch (err) { console.error('Sim error:', err.message); }
  }, 3000);
}

// ═══════════ DELAY DETECTION CRON (every minute) ═══════════
cron.schedule('* * * * *', async () => {
  try {
    const buses = await db.buses.find({ isActive: true });
    for (const bus of buses) {
      if (!bus.scheduledDepartureTime) continue;
      const [schedHour, schedMin] = bus.scheduledDepartureTime.split(':').map(Number);
      const now = new Date();
      const scheduledMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), schedHour, schedMin, 0).getTime();
      const actualMs = bus.actualDepartureTime ? new Date(bus.actualDepartureTime).getTime() : scheduledMs;
      const delayMin = Math.max(0, Math.round((actualMs - scheduledMs) / 60000));
      const isDelayed = delayMin > 5;
      await db.buses.update({ busId: bus.busId }, { $set: { delayMinutes: delayMin, isDelayed } });
      io.emit('bus:delay_update', { busId: bus.busId, busNumber: bus.busNumber, route: bus.route, delayMinutes: delayMin, isDelayed });
    }
  } catch (err) { console.error('Delay check error:', err.message); }
});

// Clean old positions daily
cron.schedule('0 0 * * *', async () => {
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  await db.positions.remove({ timestamp: { $lt: cutoff } }, { multi: true });
});

async function startServer() {
  try {
    const busCount = await db.buses.count({});
    if (busCount === 0) {
      console.log('Empty database, seeding JEC Jabalpur...');
      const { seedDatabase } = require('./seed');
      await seedDatabase();
      console.log('Database seeded!');
    }
    startBusSimulation();
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`\n🚌 TransitMesh Server — JEC Jabalpur`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   WebSocket: ws://localhost:${PORT}\n`);
    });
  } catch (err) { console.error('Failed to start:', err); process.exit(1); }
}

startServer();
