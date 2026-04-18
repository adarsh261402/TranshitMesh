# 🚌 TransitMesh — Resilient Public Transport Tracking System

A production-level, hackathon-winning prototype with **offline-first architecture**, **peer-to-peer data sharing**, **ML-based ETA prediction**, and **real-time bus tracking** for college campuses.

![Student Dashboard](https://img.shields.io/badge/Status-Live-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-v24-green) ![React](https://img.shields.io/badge/React-19-blue) ![Socket.io](https://img.shields.io/badge/Socket.io-4.7-black)

## 🚀 Quick Start

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Start the backend (auto-seeds demo data)
cd server && node server.js

# Start the frontend (in another terminal)
cd client && npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **WebSocket**: ws://localhost:5000

## 🔑 Demo Credentials

| Role | Email | Password | Admin Code |
|------|-------|----------|------------|
| Admin | admin@college.edu | Admin@123 | TRANSIT_ADMIN_2024 |
| Student | student1@college.edu | Student@123 | — |
| Student | student2@college.edu | Student@123 | — |

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Maps | Leaflet.js + react-leaflet + CartoDB Positron tiles |
| Styling | Vanilla CSS (Warm White & Golden Yellow theme) |
| Real-time | Socket.io (client + server) |
| P2P | PeerJS (WebRTC) |
| Offline Storage | localforage (IndexedDB) |
| Charts | Recharts |
| Backend | Node.js + Express |
| Database | NeDB (embedded, zero-config, MongoDB-compatible) |
| Auth | JWT + bcryptjs |
| Fonts | Sora + DM Sans + JetBrains Mono (Google Fonts) |

## ✅ Features

### Core Features
- **Real-time Map Tracking** — Leaflet map with animated bus markers (🚌), route polylines, stop markers
- **Adaptive Update Frequency** — 5s/15s/20s polling based on network quality (4G/3G/2G/offline)
- **Sparse Data Handling** — Stale data badges, buses never freeze or disappear
- **Predictive Smoothing** — 100ms linear interpolation for perfectly smooth bus movement
- **ML-based ETA Prediction** — Weighted regression on 30 days of historical arrival data
- **Store-and-Forward Buffer** — IndexedDB offline buffer with 500-entry rolling window + auto-sync

### Advanced Features
- **P2P Data Sharing (WebRTC)** — PeerJS-based relay nodes, peer discovery, mesh data propagation
- **Offline Prediction (Dead Reckoning)** — Heading + speed based prediction with degrading confidence
- **NetworkManager Singleton** — Adaptive payload compression (full/compressed/minimal)
- **Smart Notifications** — Browser Notification API + in-app toast system
- **Confidence Indicators** — 🟢 LIVE / 🟡 PEER / 🔴 PREDICTED badges on every bus
- **Multi-peer Validation** — Median consensus, outlier rejection (>200m), peer blacklisting

### Admin Panel (6 Sections)
- **System Health** — Active buses, connected students, P2P peers, ETA accuracy
- **Bus Management** — Full CRUD with add/edit/delete modals
- **Live Monitor** — Admin map with all buses, routes, and overlays
- **Network Simulation** — Weak Network / Offline / GPS Gap / Restore per bus (demo tool)
- **User Activity** — Login history, network mode, route preferences
- **Analytics Dashboard** — 4 charts: ETA accuracy, network distribution, P2P usage, punctuality

## 📁 Project Structure

```
transit-mesh/
├── server/
│   ├── models/db.js           # NeDB database setup
│   ├── routes/
│   │   ├── auth.js            # Student + Admin JWT authentication
│   │   ├── buses.js           # Bus CRUD + GPS position updates
│   │   ├── eta.js             # ML-based ETA prediction
│   │   ├── peers.js           # P2P peer discovery (Haversine)
│   │   ├── sync.js            # Offline buffer bulk sync
│   │   ├── validate.js        # Multi-peer position validation
│   │   └── admin.js           # Health, analytics, simulation
│   ├── services/
│   │   ├── SimulationService.js
│   │   └── ValidationService.js
│   ├── socket/index.js        # WebSocket event handlers
│   ├── seed.js                # Demo data generator (4 buses, 5 students, 30 days history)
│   └── server.js              # Express + Socket.io + bus simulation
├── client/
│   ├── src/
│   │   ├── services/          # NetworkManager, P2PManager, OfflineBuffer, InterpolationEngine, ETAService
│   │   ├── hooks/             # useNetworkStatus, useBusTracking, useP2P
│   │   ├── components/        # map/, ui/, auth/
│   │   ├── pages/             # Login, Register, StudentDashboard, AdminDashboard
│   │   ├── App.jsx            # Routing + auth state
│   │   └── index.css          # Complete design system
│   └── index.html             # Google Fonts + Leaflet CSS
└── package.json
```

## 🎬 Demo Scenarios

1. **Normal Operation**: Login → see live buses → click for ETA → get notification
2. **Network Degradation**: Admin simulates weak network → student sees adaptive update
3. **Full Offline + P2P**: Admin simulates offline → dead reckoning → P2P relay activates
4. **Reconnection**: Restore normal → offline buffer syncs → toast confirmation

## 📜 License

MIT
