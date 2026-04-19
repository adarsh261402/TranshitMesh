const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const { Server: SocketServer } = require('socket.io');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

// Ensure data directory
const dataDir = path.join(__dirname, '.data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = require('./models/db');

// Routes
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

const io = new SocketServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }
});

app.use(compression());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.set('io', io);
app.set('db', db);

app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/eta', etaRoutes);
app.use('/api/peers', peerRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/validate', validateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/journeys', journeyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

setupSocket(io);

const simulationService = new SimulationService(io);
app.set('simulationService', simulationService);

global.activePeers = new Map();

// Bus simulation — moves buses along routes
function startBusSimulation() {
  setInterval(async () => {
    try {
      const buses = await db.buses.find({ isActive: true });
      for (const bus of buses) {
        const simState = simulationService.getSimulationState(bus.busId);
        if (simState && simState.mode === 'offline') continue;
        if (simState && simState.mode === 'weak' && Math.random() > 0.5) continue;
        if (simState && simState.mode === 'gps_gap') {
          if (Date.now() - simState.startTime < 30000) continue;
          else simulationService.clearSimulation(bus.busId);
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

        io.emit('bus:update', { busId: bus.busId, name: bus.name, route: bus.route, routeLabel: bus.routeLabel, routePolyline: bus.routePolyline, stops: bus.stops, lat, lng, speed, heading, timestamp: new Date().toISOString(), isActive: true });
      }

      const activeBuses = await db.buses.count({ isActive: true });
      io.emit('system:health', { activeBuses, connectedUsers: io.engine.clientsCount, peerCount: global.activePeers.size, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('Sim error:', err.message);
    }
  }, 3000);
}

// Clean old positions daily
cron.schedule('0 0 * * *', async () => {
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  await db.positions.remove({ timestamp: { $lt: cutoff } }, { multi: true });
});

async function startServer() {
  try {
    // Auto-seed if database is empty
    const busCount = await db.buses.count({});
    if (busCount === 0) {
      console.log('Empty database, seeding...');
      const { seedDatabase } = require('./seed');
      await seedDatabase();
      console.log('Database seeded!');
    }

    startBusSimulation();

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`\n🚌 TransitMesh Server running on http://localhost:${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   WebSocket: ws://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

startServer();
