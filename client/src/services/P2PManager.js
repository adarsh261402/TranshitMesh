// P2PManager — WebRTC peer-to-peer data sharing via PeerJS
import Peer from 'peerjs';

class P2PManager {
  constructor() {
    this.peer = null;
    this.connections = new Map();
    this.busDataCache = new Map();
    this.listeners = new Set();
    this.peerId = null;
    this.isRelay = false;
    this.connectedPeerCount = 0;
  }

  async initialize(userId) {
    try {
      this.peerId = `tm_${userId}_${Date.now()}`;
      this.peer = new Peer(this.peerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        console.log('P2P: Connected with ID:', id);
        this._registerWithServer();
      });

      this.peer.on('connection', (conn) => {
        this._handleIncoming(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('P2P Error:', err.type);
      });
    } catch (err) {
      console.warn('P2P initialization failed:', err);
    }
  }

  async _registerWithServer() {
    try {
      const pos = { lat: 28.5459, lng: 77.1926 }; // Default campus location
      await fetch('http://localhost:5000/api/peers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId: this.peerId,
          lat: pos.lat,
          lng: pos.lng,
          networkStrength: navigator.onLine ? 'strong' : 'offline'
        })
      });
    } catch (err) {
      // Server might be unreachable
    }
  }

  _handleIncoming(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.connectedPeerCount = this.connections.size;
      this._notify();
    });

    conn.on('data', (data) => {
      if (data.type === 'REQUEST_BUS_DATA') {
        const cachedData = Array.from(this.busDataCache.values());
        conn.send({ type: 'BUS_DATA', buses: cachedData, source: 'peer' });
      } else if (data.type === 'BUS_DATA') {
        this._handlePeerData(data.buses);
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.connectedPeerCount = this.connections.size;
      this._notify();
    });
  }

  async connectToNearbyPeers() {
    try {
      const resp = await fetch('http://localhost:5000/api/peers/nearby?lat=28.5459&lng=77.1926&radius=500');
      if (!resp.ok) return;
      const peers = await resp.json();

      for (const p of peers) {
        if (p.peerId === this.peerId) continue;
        if (this.connections.has(p.peerId)) continue;

        try {
          const conn = this.peer.connect(p.peerId);
          conn.on('open', () => {
            this.connections.set(p.peerId, conn);
            this.connectedPeerCount = this.connections.size;
            conn.send({ type: 'REQUEST_BUS_DATA' });
            this._notify();
          });

          conn.on('data', (data) => {
            if (data.type === 'BUS_DATA') {
              this._handlePeerData(data.buses);
            }
          });

          conn.on('close', () => {
            this.connections.delete(p.peerId);
            this.connectedPeerCount = this.connections.size;
            this._notify();
          });
        } catch (err) {
          console.warn('Failed to connect to peer:', p.peerId);
        }
      }
    } catch (err) {
      console.warn('Failed to find nearby peers:', err);
    }
  }

  requestBusData(route) {
    this.connections.forEach((conn) => {
      try {
        conn.send({ type: 'REQUEST_BUS_DATA', route });
      } catch (err) {}
    });
  }

  updateBusCache(busId, data) {
    this.busDataCache.set(busId, { ...data, cachedAt: Date.now() });
  }

  broadcastBusData(buses) {
    const data = { type: 'BUS_DATA', buses, source: 'relay' };
    this.connections.forEach((conn) => {
      try { conn.send(data); } catch (err) {}
    });
  }

  _handlePeerData(buses) {
    if (!Array.isArray(buses)) return;
    window.dispatchEvent(new CustomEvent('p2p-bus-data', { detail: { buses } }));
    this._notify();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _notify() {
    this.listeners.forEach(fn => fn({
      connectedPeers: this.connectedPeerCount,
      isRelay: this.isRelay,
      peerId: this.peerId
    }));
  }

  getStatus() {
    return {
      peerId: this.peerId,
      connectedPeers: this.connectedPeerCount,
      isRelay: this.isRelay,
      connections: Array.from(this.connections.keys())
    };
  }

  destroy() {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    if (this.peer) this.peer.destroy();
  }
}

const p2pManager = new P2PManager();
export default p2pManager;
