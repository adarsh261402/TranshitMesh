# 📋 TransitMesh — Complete Seed Data Reference

All data below is auto-generated when the server starts for the first time.
The seed script is located at `server/seed.js`.

---

## 🔑 Authentication Credentials

### Admin Account
| Field | Value |
|-------|-------|
| Name | Admin User |
| Email | `admin@college.edu` |
| Password | `Admin@123` |
| Admin Code | `TRANSIT_ADMIN_2024` |
| Role | admin |

### Student Accounts
| # | Name | Email | Password | Student ID | Preferred Route |
|---|------|-------|----------|------------|-----------------|
| 1 | Arjun Mehta | `student1@college.edu` | `Student@123` | STU001 | Route-A |
| 2 | Priya Sharma | `student2@college.edu` | `Student@123` | STU002 | Route-B |
| 3 | Rahul Kumar | `student3@college.edu` | `Student@123` | STU003 | Route-A |
| 4 | Ananya Singh | `student4@college.edu` | `Student@123` | STU004 | Route-C |
| 5 | Vikram Patel | `student5@college.edu` | `Student@123` | STU005 | Route-D |

---

## 🚌 Bus Fleet

### Bus 1A — Hostel to Academic Block
| Field | Value |
|-------|-------|
| Bus ID | `BUS-1A` |
| Name | Bus 1A |
| Route | Route-A |
| Capacity | 50 passengers |
| Status | Active |

**Route Stops (8 stops):**
| Order | Stop Name | Latitude | Longitude |
|-------|-----------|----------|-----------|
| 0 | Hostel Gate | 28.5440 | 77.1890 |
| 1 | Hostel Block C | 28.5445 | 77.1900 |
| 2 | Sports Ground | 28.5455 | 77.1910 |
| 3 | Central Library | 28.5465 | 77.1920 |
| 4 | Main Canteen | 28.5470 | 77.1935 |
| 5 | Admin Block | 28.5478 | 77.1945 |
| 6 | Lecture Hall | 28.5485 | 77.1955 |
| 7 | Academic Block | 28.5490 | 77.1965 |

---

### Bus 2B — Gate to Library Loop
| Field | Value |
|-------|-------|
| Bus ID | `BUS-2B` |
| Name | Bus 2B |
| Route | Route-B |
| Capacity | 50 passengers |
| Status | Active |

**Route Stops (6 stops):**
| Order | Stop Name | Latitude | Longitude |
|-------|-----------|----------|-----------|
| 0 | Main Gate | 28.5430 | 77.1880 |
| 1 | Visitor Center | 28.5440 | 77.1895 |
| 2 | Central Library | 28.5465 | 77.1920 |
| 3 | Research Park | 28.5475 | 77.1940 |
| 4 | Faculty Housing | 28.5480 | 77.1960 |
| 5 | Library Loop | 28.5470 | 77.1950 |

---

### Bus 3C — Sports Complex Shuttle
| Field | Value |
|-------|-------|
| Bus ID | `BUS-3C` |
| Name | Bus 3C |
| Route | Route-C |
| Capacity | 50 passengers |
| Status | Active |

**Route Stops (5 stops):**
| Order | Stop Name | Latitude | Longitude |
|-------|-----------|----------|-----------|
| 0 | Sports Complex | 28.5450 | 77.1905 |
| 1 | Swimming Pool | 28.5455 | 77.1915 |
| 2 | Tennis Courts | 28.5460 | 77.1925 |
| 3 | Athletics Track | 28.5465 | 77.1935 |
| 4 | Gym Building | 28.5458 | 77.1945 |

---

### Bus 4D — City Pickup Route
| Field | Value |
|-------|-------|
| Bus ID | `BUS-4D` |
| Name | Bus 4D |
| Route | Route-D |
| Capacity | 50 passengers |
| Status | Active |

**Route Stops (10 stops):**
| Order | Stop Name | Latitude | Longitude |
|-------|-----------|----------|-----------|
| 0 | City Bus Stand | 28.5410 | 77.1850 |
| 1 | Metro Station | 28.5420 | 77.1860 |
| 2 | Market Square | 28.5425 | 77.1870 |
| 3 | Hospital Junction | 28.5430 | 77.1880 |
| 4 | Main Gate | 28.5435 | 77.1890 |
| 5 | Hostel Gate | 28.5440 | 77.1900 |
| 6 | Central Library | 28.5465 | 77.1920 |
| 7 | Admin Block | 28.5478 | 77.1945 |
| 8 | Lecture Hall | 28.5485 | 77.1955 |
| 9 | Academic Block | 28.5490 | 77.1965 |

---

## 📊 Historical Training Data

The seed script generates **30 days of historical data** for ML-based ETA prediction:

### Arrival Records (~3,066 records)
For each bus × each stop × 30 days × 3-4 arrivals per day:

| Field | Description | Example Values |
|-------|-------------|----------------|
| busId | Bus identifier | `BUS-1A`, `BUS-2B`, etc. |
| stopName | Stop name | `Central Library`, `Main Gate`, etc. |
| scheduledTime | Planned arrival | ISO datetime |
| actualArrivalTime | Real arrival | ISO datetime |
| dayOfWeek | 0 (Sun) – 6 (Sat) | `0`, `1`, `2`, `3`, `4`, `5`, `6` |
| delayMinutes | Deviation from schedule | `-3.0` to `+7.0` minutes |
| speed | Speed at arrival | `15` – `40` km/h |
| passengerLoad | Passengers on board | `0` – `50` |
| weather | Weather condition | `clear`, `rain`, `heavy_rain`, `fog` |

**Arrival schedule pattern:**
- ~7:00 AM (morning shift)
- ~10:00 AM (mid-morning)
- ~1:00 PM (afternoon)
- ~4:00 PM (evening, some days)

---

## 🌐 API Endpoints Reference

### Authentication
| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Student signup | `{name, email, password, studentId, routePreference}` |
| POST | `/api/auth/login` | Student login | `{email, password}` |
| POST | `/api/auth/admin/login` | Admin login | `{email, password, adminCode}` |
| GET | `/api/auth/me` | Get current user | Header: `Authorization: Bearer <token>` |

### Buses
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/buses` | All active buses | None |
| GET | `/api/buses/all` | All buses (inc. inactive) | Admin |
| GET | `/api/buses/:id` | Single bus + history | None |
| POST | `/api/buses` | Create bus | Admin |
| PUT | `/api/buses/:id` | Update bus | Admin |
| DELETE | `/api/buses/:id` | Delete bus | Admin |
| POST | `/api/buses/:id/position` | Update GPS position | None |

### ETA Prediction
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/eta/:busId/:stopId` | ETA for specific stop |
| GET | `/api/eta/:busId` | ETAs for all stops on route |

### P2P Peers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/peers/register` | Register as peer |
| GET | `/api/peers/nearby?lat=X&lng=Y&radius=500` | Find nearby peers |
| DELETE | `/api/peers/:id` | Deregister peer |

### Sync & Validation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync/bulk` | Bulk upload offline buffer |
| POST | `/api/validate/position` | Multi-peer position validation |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/health` | System health stats |
| GET | `/api/admin/users` | Student activity list |
| GET | `/api/admin/analytics` | Chart data (7-day) |
| POST | `/api/admin/simulate` | Network simulation control |

### WebSocket Events (Socket.io)
**Server → Client:**
| Event | Payload |
|-------|---------|
| `bus:update` | `{busId, name, route, lat, lng, speed, heading, timestamp, isActive}` |
| `system:health` | `{activeBuses, connectedUsers, peerCount, timestamp}` |
| `notification` | `{type, message, busId}` |
| `simulation:state` | `{busId, mode, active}` |

**Client → Server:**
| Event | Payload |
|-------|---------|
| `subscribe:route` | `{routeId}` |
| `peer:register` | `{peerId, lat, lng, signalStrength}` |
| `position:report` | `{busId, lat, lng, timestamp, speed, heading}` |

---

## 🗺️ Campus Map Info

All coordinates are based around the **IIT Delhi campus area**:
- **Center**: 28.5459°N, 77.1926°E
- **Map Tiles**: CartoDB Positron (light theme, free, no API key)
- **Zoom Level**: 16 (campus level)

---

## 🔧 Database Storage

The app uses **NeDB** (embedded, file-based, MongoDB-compatible):
- Database files stored in `server/.data/` directory
- Auto-created on first run
- Files: `users.db`, `buses.db`, `positions.db`, `arrivals.db`, `peers.db`
- To reset: delete the `server/.data/` folder and restart server

---

## 🎮 Simulation Modes

Available via Admin Panel → Simulation or `POST /api/admin/simulate`:

| Mode | Effect | Duration |
|------|--------|----------|
| `weak` | 50% of GPS updates skipped | Until restored |
| `offline` | All GPS updates stopped | Until restored |
| `gps_gap` | 30-second GPS blackout, then auto-resume | 30 seconds |
| `normal` | Restore normal operation | Immediate |
