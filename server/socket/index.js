const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'transit-mesh-secret-key-2024';

function setupSocket(io) {
  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded;
      } catch (err) {
        // Allow unauthenticated connections for demo
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} ${socket.user ? `(${socket.user.name})` : '(anonymous)'}`);

    // Subscribe to route updates
    socket.on('subscribe:route', ({ routeId }) => {
      socket.join(`route:${routeId}`);
      console.log(`${socket.id} subscribed to route: ${routeId}`);
    });

    // Unsubscribe from route
    socket.on('unsubscribe:route', ({ routeId }) => {
      socket.leave(`route:${routeId}`);
    });

    // Peer registration
    socket.on('peer:register', ({ peerId, lat, lng, signalStrength }) => {
      if (global.activePeers) {
        global.activePeers.set(peerId || socket.id, {
          peerId: peerId || socket.id,
          lat, lng,
          networkStrength: signalStrength || 'strong',
          lastSeen: Date.now(),
          socketId: socket.id
        });
      }
    });

    // Position report from client
    socket.on('position:report', ({ busId, lat, lng, timestamp, speed, heading }) => {
      // Broadcast to all clients
      io.emit('bus:update', {
        busId, lat, lng, speed, heading,
        timestamp: timestamp || new Date().toISOString(),
        source: 'peer'
      });
    });

    // Request bus data (for P2P simulation)
    socket.on('request:bus_data', ({ route }) => {
      // Forward to peers with strong network
      socket.broadcast.emit('bus:data_request', { requesterId: socket.id, route });
    });

    // Respond with bus data
    socket.on('respond:bus_data', ({ requesterId, data }) => {
      io.to(requesterId).emit('bus:peer_data', data);
    });

    // Update user network status
    socket.on('network:status', ({ mode }) => {
      if (socket.user) {
        // Could update user's network mode in DB
        console.log(`${socket.user.name} network: ${mode}`);
      }
    });

    socket.on('disconnect', () => {
      // Remove from active peers
      if (global.activePeers) {
        global.activePeers.forEach((peer, key) => {
          if (peer.socketId === socket.id) {
            global.activePeers.delete(key);
          }
        });
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = setupSocket;
