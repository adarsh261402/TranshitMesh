const bcrypt = require('bcryptjs');
const db = require('./models/db');

async function seedDatabase() {
  await db.users.remove({}, { multi: true });
  await db.buses.remove({}, { multi: true });
  await db.arrivals.remove({}, { multi: true });
  await db.positions.remove({}, { multi: true });

  console.log('Seeding database...');

  const hp = await bcrypt.hash('Admin@123', 10);
  const hs = await bcrypt.hash('Student@123', 10);

  await db.users.insert({ name: 'Admin User', email: 'admin@college.edu', password: hp, role: 'admin', lastSeen: new Date().toISOString(), networkMode: 'online' });

  const students = [
    { name: 'Arjun Mehta', id: 'STU001', route: 'Route-A' },
    { name: 'Priya Sharma', id: 'STU002', route: 'Route-B' },
    { name: 'Rahul Kumar', id: 'STU003', route: 'Route-A' },
    { name: 'Ananya Singh', id: 'STU004', route: 'Route-C' },
    { name: 'Vikram Patel', id: 'STU005', route: 'Route-D' }
  ];
  for (let i = 0; i < students.length; i++) {
    await db.users.insert({ name: students[i].name, email: `student${i + 1}@college.edu`, password: hs, role: 'student', studentId: students[i].id, routePreference: students[i].route, lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(), networkMode: 'online' });
  }
  console.log('  ✓ Users created');

  const busData = [
    { busId: 'BUS-1A', name: 'Bus 1A', route: 'Route-A', stops: [
      { name: 'Hostel Gate', lat: 28.5440, lng: 77.1890, order: 0 }, { name: 'Hostel Block C', lat: 28.5445, lng: 77.1900, order: 1 },
      { name: 'Sports Ground', lat: 28.5455, lng: 77.1910, order: 2 }, { name: 'Central Library', lat: 28.5465, lng: 77.1920, order: 3 },
      { name: 'Main Canteen', lat: 28.5470, lng: 77.1935, order: 4 }, { name: 'Admin Block', lat: 28.5478, lng: 77.1945, order: 5 },
      { name: 'Lecture Hall', lat: 28.5485, lng: 77.1955, order: 6 }, { name: 'Academic Block', lat: 28.5490, lng: 77.1965, order: 7 }
    ]},
    { busId: 'BUS-2B', name: 'Bus 2B', route: 'Route-B', stops: [
      { name: 'Main Gate', lat: 28.5430, lng: 77.1880, order: 0 }, { name: 'Visitor Center', lat: 28.5440, lng: 77.1895, order: 1 },
      { name: 'Central Library', lat: 28.5465, lng: 77.1920, order: 2 }, { name: 'Research Park', lat: 28.5475, lng: 77.1940, order: 3 },
      { name: 'Faculty Housing', lat: 28.5480, lng: 77.1960, order: 4 }, { name: 'Library Loop', lat: 28.5470, lng: 77.1950, order: 5 }
    ]},
    { busId: 'BUS-3C', name: 'Bus 3C', route: 'Route-C', stops: [
      { name: 'Sports Complex', lat: 28.5450, lng: 77.1905, order: 0 }, { name: 'Swimming Pool', lat: 28.5455, lng: 77.1915, order: 1 },
      { name: 'Tennis Courts', lat: 28.5460, lng: 77.1925, order: 2 }, { name: 'Athletics Track', lat: 28.5465, lng: 77.1935, order: 3 },
      { name: 'Gym Building', lat: 28.5458, lng: 77.1945, order: 4 }
    ]},
    { busId: 'BUS-4D', name: 'Bus 4D', route: 'Route-D', stops: [
      { name: 'City Bus Stand', lat: 28.5410, lng: 77.1850, order: 0 }, { name: 'Metro Station', lat: 28.5420, lng: 77.1860, order: 1 },
      { name: 'Market Square', lat: 28.5425, lng: 77.1870, order: 2 }, { name: 'Hospital Junction', lat: 28.5430, lng: 77.1880, order: 3 },
      { name: 'Main Gate', lat: 28.5435, lng: 77.1890, order: 4 }, { name: 'Hostel Gate', lat: 28.5440, lng: 77.1900, order: 5 },
      { name: 'Central Library', lat: 28.5465, lng: 77.1920, order: 6 }, { name: 'Admin Block', lat: 28.5478, lng: 77.1945, order: 7 },
      { name: 'Lecture Hall', lat: 28.5485, lng: 77.1955, order: 8 }, { name: 'Academic Block', lat: 28.5490, lng: 77.1965, order: 9 }
    ]}
  ];

  for (const d of busData) {
    await db.buses.insert({ ...d, currentLat: d.stops[0].lat, currentLng: d.stops[0].lng, speed: 0, heading: 0, isActive: true, currentStopIndex: 0, routeProgress: 0, direction: 1, passengerCount: Math.floor(Math.random() * 30), capacity: 50, lastUpdated: new Date().toISOString() });
  }
  console.log('  ✓ 4 buses created');

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
  console.log('\n📋 Credentials:');
  console.log('  Admin: admin@college.edu / Admin@123 (code: TRANSIT_ADMIN_2024)');
  console.log('  Students: student1-5@college.edu / Student@123\n');
}

module.exports = { seedDatabase };

if (require.main === module) { seedDatabase().then(() => process.exit(0)); }
