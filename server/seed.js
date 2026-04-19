const bcrypt = require('bcryptjs');
const db = require('./models/db');

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function addCumulativeDistances(stops) {
  let cumDist = 0;
  return stops.map((s, i) => {
    if (i > 0) cumDist += haversineKm(stops[i - 1].lat, stops[i - 1].lng, s.lat, s.lng);
    return { ...s, cumulativeDistanceKm: Math.round(cumDist * 10000) / 10000 };
  });
}

// ═══════════════════════════════════════════════════════════
// JEC JABALPUR CAMPUS LANDMARKS (lat 23.1817, lng 79.9895)
// ═══════════════════════════════════════════════════════════
const STOPS = {
  mainGate:    { name: 'Main Gate',          lat: 23.1802, lng: 79.9878 },
  adminBlock:  { name: 'Admin Block',        lat: 23.1812, lng: 79.9885 },
  civilDept:   { name: 'Civil Engineering',  lat: 23.1820, lng: 79.9880 },
  mechDept:    { name: 'Mechanical Dept',    lat: 23.1825, lng: 79.9892 },
  eceDept:     { name: 'ECE Dept',           lat: 23.1830, lng: 79.9900 },
  cseDept:     { name: 'CSE Dept',           lat: 23.1835, lng: 79.9908 },
  library:     { name: 'Central Library',    lat: 23.1828, lng: 79.9915 },
  lake:        { name: 'Robertson Lake',     lat: 23.1840, lng: 79.9920 },
  boysHostel:  { name: 'Boys Hostel A',      lat: 23.1850, lng: 79.9905 },
  girlsHostel: { name: 'Girls Hostel',       lat: 23.1848, lng: 79.9890 },
  sportsGround:{ name: 'Sports Ground',      lat: 23.1855, lng: 79.9878 },
  canteen:     { name: 'Canteen / Mess',     lat: 23.1842, lng: 79.9882 },
  workshop:    { name: 'Workshop / Labs',    lat: 23.1818, lng: 79.9910 },
  auditorium:  { name: 'Auditorium (Jashn)', lat: 23.1808, lng: 79.9902 },
  medical:     { name: 'Medical Center',     lat: 23.1815, lng: 79.9920 },
  parking:     { name: 'Parking Area',       lat: 23.1800, lng: 79.9893 },
  nccGround:   { name: 'NCC Ground',         lat: 23.1860, lng: 79.9895 },
  backGate:    { name: 'Back Gate (Dindori)',lat: 23.1870, lng: 79.9900 },
};

function makeStops(keys) {
  return addCumulativeDistances(keys.map((k, i) => ({ ...STOPS[k], order: i })));
}

async function seedDatabase() {
  await db.users.remove({}, { multi: true });
  await db.buses.remove({}, { multi: true });
  await db.arrivals.remove({}, { multi: true });
  await db.positions.remove({}, { multi: true });
  await db.journeys.remove({}, { multi: true });
  console.log('Seeding JEC Jabalpur database...');

  const hp = await bcrypt.hash('Admin@123', 10);
  const hs = await bcrypt.hash('Student@123', 10);
  await db.users.insert({ name: 'Admin User', email: 'admin@college.edu', password: hp, role: 'admin', lastSeen: new Date().toISOString(), networkMode: 'online' });

  const students = [
    { name: 'Arjun Mehta', id: 'STU001', route: 'route_1' },
    { name: 'Priya Sharma', id: 'STU002', route: 'route_2' },
    { name: 'Rahul Kumar', id: 'STU003', route: 'route_1' },
    { name: 'Ananya Singh', id: 'STU004', route: 'route_5' },
    { name: 'Vikram Patel', id: 'STU005', route: 'route_4' }
  ];
  for (let i = 0; i < students.length; i++) {
    await db.users.insert({ name: students[i].name, email: `student${i + 1}@college.edu`, password: hs, role: 'student', studentId: students[i].id, routePreference: students[i].route, lastSeen: new Date().toISOString(), networkMode: 'online' });
  }
  console.log('  ✓ Users created');

  // ═══════════════════════════════════════
  // 8 Routes + multi-bus for routes 1,2,3
  // ═══════════════════════════════════════
  const routes = [
    { routeId: 'route_1', routeLabel: 'Campus Express', color: '#E53935',
      stopKeys: ['mainGate','adminBlock','civilDept','mechDept','eceDept','cseDept','library'] },
    { routeId: 'route_2', routeLabel: 'Hostel Loop', color: '#1E88E5',
      stopKeys: ['mainGate','parking','canteen','boysHostel','girlsHostel','sportsGround'] },
    { routeId: 'route_3', routeLabel: 'Tech Block Circuit', color: '#43A047',
      stopKeys: ['adminBlock','workshop','eceDept','cseDept','library','auditorium'] },
    { routeId: 'route_4', routeLabel: 'Lake Route', color: '#8E24AA',
      stopKeys: ['mainGate','auditorium','medical','library','lake','cseDept','backGate'] },
    { routeId: 'route_5', routeLabel: 'Sports Shuttle', color: '#F4511E',
      stopKeys: ['boysHostel','nccGround','sportsGround','canteen','girlsHostel'] },
    { routeId: 'route_6', routeLabel: 'Academic Loop', color: '#00ACC1',
      stopKeys: ['civilDept','mechDept','workshop','eceDept','cseDept','library'] },
    { routeId: 'route_7', routeLabel: 'Medical Corridor', color: '#FFB300',
      stopKeys: ['mainGate','adminBlock','medical','library','eceDept','cseDept'] },
    { routeId: 'route_8', routeLabel: 'Event & Exit Route', color: '#6D4C41',
      stopKeys: ['auditorium','parking','mainGate','adminBlock','canteen','backGate'] },
  ];

  // Multi-bus: routes 1,2,3 get a second bus
  const busEntries = [];
  const busIdMap = {
    route_1: [
      { busId: 'BUS-1A-1', name: 'Campus Express #1', busNumber: '1A-1', scheduledDepartureTime: '08:00', delayMinutes: 0, isDelayed: false },
      { busId: 'BUS-1A-2', name: 'Campus Express #2', busNumber: '1A-2', scheduledDepartureTime: '08:20', delayMinutes: 15, isDelayed: true },
    ],
    route_2: [
      { busId: 'BUS-2B-1', name: 'Hostel Loop #1', busNumber: '2B-1', scheduledDepartureTime: '07:30', delayMinutes: 0, isDelayed: false },
      { busId: 'BUS-2B-2', name: 'Hostel Loop #2', busNumber: '2B-2', scheduledDepartureTime: '07:50', delayMinutes: 8, isDelayed: true },
    ],
    route_3: [
      { busId: 'BUS-3C-1', name: 'Tech Block #1', busNumber: '3C-1', scheduledDepartureTime: '08:15', delayMinutes: 0, isDelayed: false },
      { busId: 'BUS-3C-2', name: 'Tech Block #2', busNumber: '3C-2', scheduledDepartureTime: '08:30', delayMinutes: -3, isDelayed: false },
    ],
    route_4: [{ busId: 'BUS-4D', name: 'Lake Route', busNumber: '4D', scheduledDepartureTime: '08:00', delayMinutes: 0, isDelayed: false }],
    route_5: [{ busId: 'BUS-5E', name: 'Sports Shuttle', busNumber: '5E', scheduledDepartureTime: '07:45', delayMinutes: 0, isDelayed: false }],
    route_6: [{ busId: 'BUS-6F', name: 'Academic Loop', busNumber: '6F', scheduledDepartureTime: '08:10', delayMinutes: 0, isDelayed: false }],
    route_7: [{ busId: 'BUS-7G', name: 'Medical Corridor', busNumber: '7G', scheduledDepartureTime: '08:30', delayMinutes: 0, isDelayed: false }],
    route_8: [{ busId: 'BUS-8H', name: 'Event & Exit', busNumber: '8H', scheduledDepartureTime: '09:00', delayMinutes: 0, isDelayed: false }],
  };

  for (const route of routes) {
    const stops = makeStops(route.stopKeys);
    const routePolyline = stops.map(s => [s.lat, s.lng]);
    const busDefs = busIdMap[route.routeId];

    for (let bi = 0; bi < busDefs.length; bi++) {
      const bd = busDefs[bi];
      // Offset starting position for second bus on same route
      const startIdx = bi === 0 ? 0 : Math.min(2, stops.length - 1);
      const now = new Date();
      const [sh, sm] = bd.scheduledDepartureTime.split(':').map(Number);
      const scheduled = new Date(now); scheduled.setHours(sh, sm, 0, 0);
      const actual = new Date(scheduled.getTime() + (bd.delayMinutes || 0) * 60000);

      await db.buses.insert({
        busId: bd.busId, name: bd.name, busNumber: bd.busNumber,
        route: route.routeId, routeLabel: route.routeLabel, routeColor: route.color,
        routePolyline, stops,
        currentLat: stops[startIdx].lat, currentLng: stops[startIdx].lng,
        speed: 0, heading: 0, isActive: true,
        currentStopIndex: startIdx, routeProgress: 0, direction: 1,
        passengerCount: Math.floor(Math.random() * 30), capacity: 50,
        lastUpdated: new Date().toISOString(),
        scheduledDepartureTime: bd.scheduledDepartureTime,
        actualDepartureTime: actual.toISOString(),
        delayMinutes: Math.max(0, bd.delayMinutes),
        isDelayed: bd.isDelayed,
        frequency: bi === 0 ? 'Every 20 min' : 'Every 20 min',
      });
      busEntries.push({ busId: bd.busId, route: route.routeId, stops });
    }
  }
  console.log(`  ✓ ${busEntries.length} buses created (11 total, multi-bus on routes 1-3)`);

  // Arrival records for ML training
  const weathers = ['clear', 'clear', 'clear', 'rain', 'fog'];
  let rc = 0;
  for (const be of busEntries) {
    for (const stop of be.stops) {
      for (let day = 0; day < 15; day++) {
        const n = 2 + Math.floor(Math.random() * 2);
        for (let a = 0; a < n; a++) {
          const base = new Date(Date.now() - day * 86400000);
          base.setHours(7 + a * 3 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
          const delay = (Math.random() - 0.3) * 10;
          await db.arrivals.insert({ busId: be.busId, stopName: stop.name, scheduledTime: base.toISOString(), actualArrivalTime: new Date(base.getTime() + delay * 60000).toISOString(), dayOfWeek: base.getDay(), delayMinutes: Math.round(delay * 10) / 10, speed: 15 + Math.random() * 25, passengerLoad: Math.floor(Math.random() * 50), weather: weathers[Math.floor(Math.random() * weathers.length)] });
          rc++;
        }
      }
    }
  }
  console.log(`  ✓ ${rc} arrival records`);

  // Sample journeys
  const allStudents = await db.users.find({ role: 'student' });
  let jc = 0;
  for (const stu of allStudents) {
    for (let d = 0; d < 5; d++) {
      const be = busEntries[Math.floor(Math.random() * busEntries.length)];
      const fromIdx = Math.floor(Math.random() * Math.max(1, be.stops.length - 2));
      const toIdx = fromIdx + 1 + Math.floor(Math.random() * (be.stops.length - fromIdx - 1));
      const boardTime = new Date(Date.now() - d * 86400000);
      boardTime.setHours(7 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
      const dur = 5 + Math.floor(Math.random() * 20);
      const dropTime = new Date(boardTime.getTime() + dur * 60000);
      const dist = Math.round((be.stops[toIdx].cumulativeDistanceKm - be.stops[fromIdx].cumulativeDistanceKm) * 100) / 100;
      await db.journeys.insert({
        userId: stu._id, busId: be.busId, busName: be.busId, routeName: be.route, routeLabel: be.route,
        boardingStop: { name: be.stops[fromIdx].name, lat: be.stops[fromIdx].lat, lng: be.stops[fromIdx].lng },
        dropOffStop: { name: be.stops[toIdx].name, lat: be.stops[toIdx].lat, lng: be.stops[toIdx].lng },
        boardingTime: boardTime.toISOString(), dropOffTime: dropTime.toISOString(),
        durationMinutes: dur, distanceKm: Math.max(0.1, dist), status: 'completed'
      });
      jc++;
    }
  }
  console.log(`  ✓ ${jc} sample journeys`);
  console.log('\n📋 JEC Jabalpur Campus — Credentials:');
  console.log('  Admin:    admin@college.edu / Admin@123 (code: TRANSIT_ADMIN_2024)');
  console.log('  Students: student1-5@college.edu / Student@123\n');
}

module.exports = { seedDatabase };
if (require.main === module) { seedDatabase().then(() => process.exit(0)); }
