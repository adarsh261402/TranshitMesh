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
    return { ...s, cumulativeDistanceKm: Math.round(cumDist * 1000) / 1000 };
  });
}

async function seedDatabase() {
  await db.users.remove({}, { multi: true });
  await db.buses.remove({}, { multi: true });
  await db.arrivals.remove({}, { multi: true });
  await db.positions.remove({}, { multi: true });
  await db.journeys.remove({}, { multi: true });
  console.log('Seeding database...');

  const hp = await bcrypt.hash('Admin@123', 10);
  const hs = await bcrypt.hash('Student@123', 10);
  await db.users.insert({ name: 'Admin User', email: 'admin@college.edu', password: hp, role: 'admin', lastSeen: new Date().toISOString(), networkMode: 'online' });

  const students = [
    { name: 'Arjun Mehta', id: 'STU001', route: 'Route-1' },
    { name: 'Priya Sharma', id: 'STU002', route: 'Route-2' },
    { name: 'Rahul Kumar', id: 'STU003', route: 'Route-1' },
    { name: 'Ananya Singh', id: 'STU004', route: 'Route-5' },
    { name: 'Vikram Patel', id: 'STU005', route: 'Route-4' }
  ];
  for (let i = 0; i < students.length; i++) {
    await db.users.insert({ name: students[i].name, email: `student${i + 1}@college.edu`, password: hs, role: 'student', studentId: students[i].id, routePreference: students[i].route, lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(), networkMode: 'online' });
  }
  console.log('  ✓ Users created');

  // ═══════════════════════════════════════
  // 8 Bus Routes — Campus centered at 28.5459, 77.1926
  // ═══════════════════════════════════════
  const busData = [
    {
      busId: 'BUS-1A', name: 'Shuttle Alpha', route: 'Route-1', routeLabel: 'Hostel A → Academic Block',
      stops: addCumulativeDistances([
        { name: 'Hostel A Gate', lat: 28.5410, lng: 77.1880, order: 0 },
        { name: 'Hostel B Wing', lat: 28.5418, lng: 77.1892, order: 1 },
        { name: 'Sports Pavilion', lat: 28.5430, lng: 77.1905, order: 2 },
        { name: 'Open Air Theatre', lat: 28.5442, lng: 77.1915, order: 3 },
        { name: 'Central Library', lat: 28.5455, lng: 77.1925, order: 4 },
        { name: 'Admin Block', lat: 28.5465, lng: 77.1938, order: 5 },
        { name: 'Lecture Complex', lat: 28.5475, lng: 77.1950, order: 6 },
        { name: 'Academic Block', lat: 28.5488, lng: 77.1960, order: 7 }
      ])
    },
    {
      busId: 'BUS-2B', name: 'Shuttle Beta', route: 'Route-2', routeLabel: 'Main Gate → Central Library',
      stops: addCumulativeDistances([
        { name: 'Main Gate', lat: 28.5425, lng: 77.1870, order: 0 },
        { name: 'Visitor Lounge', lat: 28.5435, lng: 77.1885, order: 1 },
        { name: 'Clock Tower', lat: 28.5448, lng: 77.1900, order: 2 },
        { name: 'Food Court', lat: 28.5455, lng: 77.1915, order: 3 },
        { name: 'Central Library', lat: 28.5460, lng: 77.1928, order: 4 },
        { name: 'Research Park', lat: 28.5468, lng: 77.1942, order: 5 }
      ])
    },
    {
      busId: 'BUS-3C', name: 'Shuttle Gamma', route: 'Route-3', routeLabel: 'Sports Complex → Admin Block',
      stops: addCumulativeDistances([
        { name: 'Sports Complex', lat: 28.5420, lng: 77.1910, order: 0 },
        { name: 'Swimming Pool', lat: 28.5432, lng: 77.1920, order: 1 },
        { name: 'Tennis Courts', lat: 28.5445, lng: 77.1930, order: 2 },
        { name: 'Faculty Club', lat: 28.5458, lng: 77.1938, order: 3 },
        { name: 'Admin Block', lat: 28.5468, lng: 77.1945, order: 4 }
      ])
    },
    {
      busId: 'BUS-4D', name: 'Shuttle Delta', route: 'Route-4', routeLabel: 'City Pickup → Campus Entry',
      stops: addCumulativeDistances([
        { name: 'City Bus Stand', lat: 28.5350, lng: 77.1820, order: 0 },
        { name: 'Metro Station', lat: 28.5362, lng: 77.1835, order: 1 },
        { name: 'Market Complex', lat: 28.5375, lng: 77.1848, order: 2 },
        { name: 'Hospital Junction', lat: 28.5388, lng: 77.1858, order: 3 },
        { name: 'Flyover Bridge', lat: 28.5398, lng: 77.1865, order: 4 },
        { name: 'Service Road', lat: 28.5408, lng: 77.1872, order: 5 },
        { name: 'Security Check', lat: 28.5415, lng: 77.1878, order: 6 },
        { name: 'Main Gate', lat: 28.5425, lng: 77.1882, order: 7 },
        { name: 'Drop-off Zone', lat: 28.5435, lng: 77.1890, order: 8 },
        { name: 'Campus Square', lat: 28.5445, lng: 77.1900, order: 9 }
      ])
    },
    {
      busId: 'BUS-5E', name: 'Shuttle Echo', route: 'Route-5', routeLabel: 'Boys Hostel → Girls Hostel → Canteen',
      stops: addCumulativeDistances([
        { name: 'Boys Hostel North', lat: 28.5405, lng: 77.1895, order: 0 },
        { name: 'Boys Hostel South', lat: 28.5415, lng: 77.1905, order: 1 },
        { name: 'Laundry Block', lat: 28.5425, lng: 77.1915, order: 2 },
        { name: 'Girls Hostel', lat: 28.5438, lng: 77.1920, order: 3 },
        { name: 'Staff Quarters', lat: 28.5448, lng: 77.1912, order: 4 },
        { name: 'Night Canteen', lat: 28.5455, lng: 77.1905, order: 5 },
        { name: 'Main Canteen', lat: 28.5462, lng: 77.1918, order: 6 }
      ])
    },
    {
      busId: 'BUS-6F', name: 'Shuttle Foxtrot', route: 'Route-6', routeLabel: 'Workshop → Labs → Library',
      stops: addCumulativeDistances([
        { name: 'Workshop Bay', lat: 28.5470, lng: 77.1895, order: 0 },
        { name: 'Mech Lab', lat: 28.5478, lng: 77.1908, order: 1 },
        { name: 'CS Lab Block', lat: 28.5482, lng: 77.1920, order: 2 },
        { name: 'Physics Lab', lat: 28.5475, lng: 77.1932, order: 3 },
        { name: 'Chemistry Wing', lat: 28.5468, lng: 77.1940, order: 4 },
        { name: 'Central Library', lat: 28.5458, lng: 77.1928, order: 5 }
      ])
    },
    {
      busId: 'BUS-7G', name: 'Shuttle Golf', route: 'Route-7', routeLabel: 'Medical Center → Academic Block',
      stops: addCumulativeDistances([
        { name: 'Medical Center', lat: 28.5490, lng: 77.1900, order: 0 },
        { name: 'Pharmacy', lat: 28.5485, lng: 77.1915, order: 1 },
        { name: 'Bio-Sciences', lat: 28.5480, lng: 77.1930, order: 2 },
        { name: 'Nano Lab', lat: 28.5482, lng: 77.1945, order: 3 },
        { name: 'Academic Block', lat: 28.5488, lng: 77.1958, order: 4 }
      ])
    },
    {
      busId: 'BUS-8H', name: 'Shuttle Hotel', route: 'Route-8', routeLabel: 'Auditorium → Parking → Main Gate',
      stops: addCumulativeDistances([
        { name: 'Auditorium', lat: 28.5460, lng: 77.1880, order: 0 },
        { name: 'Convention Hall', lat: 28.5452, lng: 77.1890, order: 1 },
        { name: 'East Parking', lat: 28.5445, lng: 77.1878, order: 2 },
        { name: 'West Parking', lat: 28.5438, lng: 77.1870, order: 3 },
        { name: 'Security Booth', lat: 28.5430, lng: 77.1868, order: 4 },
        { name: 'Main Gate', lat: 28.5425, lng: 77.1872, order: 5 }
      ])
    }
  ];

  for (const d of busData) {
    const routePolyline = d.stops.map(s => [s.lat, s.lng]);
    await db.buses.insert({
      ...d, routePolyline, currentLat: d.stops[0].lat, currentLng: d.stops[0].lng,
      speed: 0, heading: 0, isActive: true, currentStopIndex: 0, routeProgress: 0, direction: 1,
      passengerCount: Math.floor(Math.random() * 30), capacity: 50, lastUpdated: new Date().toISOString()
    });
  }
  console.log('  ✓ 8 buses created');

  // Arrival records for ML training
  const weathers = ['clear', 'clear', 'clear', 'rain', 'fog'];
  let rc = 0;
  for (const bus of busData) {
    for (const stop of bus.stops) {
      for (let day = 0; day < 30; day++) {
        const n = 3 + Math.floor(Math.random() * 2);
        for (let a = 0; a < n; a++) {
          const base = new Date(Date.now() - day * 86400000);
          base.setHours(7 + a * 3 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
          const delay = (Math.random() - 0.3) * 10;
          await db.arrivals.insert({ busId: bus.busId, stopName: stop.name, scheduledTime: base.toISOString(), actualArrivalTime: new Date(base.getTime() + delay * 60000).toISOString(), dayOfWeek: base.getDay(), delayMinutes: Math.round(delay * 10) / 10, speed: 15 + Math.random() * 25, passengerLoad: Math.floor(Math.random() * 50), weather: weathers[Math.floor(Math.random() * weathers.length)] });
          rc++;
        }
      }
    }
  }
  console.log(`  ✓ ${rc} arrival records`);

  // Sample journeys for demo
  const allStudents = await db.users.find({ role: 'student' });
  let jc = 0;
  for (const stu of allStudents) {
    for (let d = 0; d < 5; d++) {
      const bus = busData[Math.floor(Math.random() * busData.length)];
      const fromIdx = Math.floor(Math.random() * Math.max(1, bus.stops.length - 2));
      const toIdx = fromIdx + 1 + Math.floor(Math.random() * (bus.stops.length - fromIdx - 1));
      const boardTime = new Date(Date.now() - d * 86400000);
      boardTime.setHours(7 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
      const dur = 5 + Math.floor(Math.random() * 20);
      const dropTime = new Date(boardTime.getTime() + dur * 60000);
      const dist = Math.round((bus.stops[toIdx].cumulativeDistanceKm - bus.stops[fromIdx].cumulativeDistanceKm) * 100) / 100;
      await db.journeys.insert({
        userId: stu._id, busId: bus.busId, busName: bus.name, routeName: bus.route, routeLabel: bus.routeLabel,
        boardingStop: { name: bus.stops[fromIdx].name, lat: bus.stops[fromIdx].lat, lng: bus.stops[fromIdx].lng },
        dropOffStop: { name: bus.stops[toIdx].name, lat: bus.stops[toIdx].lat, lng: bus.stops[toIdx].lng },
        boardingTime: boardTime.toISOString(), dropOffTime: dropTime.toISOString(),
        durationMinutes: dur, distanceKm: Math.max(0.1, dist), status: 'completed'
      });
      jc++;
    }
  }
  console.log(`  ✓ ${jc} sample journeys`);
  console.log('\n📋 Credentials:');
  console.log('  Admin:    admin@college.edu / Admin@123 (code: TRANSIT_ADMIN_2024)');
  console.log('  Students: student1-5@college.edu / Student@123\n');
}

module.exports = { seedDatabase };
if (require.main === module) { seedDatabase().then(() => process.exit(0)); }
