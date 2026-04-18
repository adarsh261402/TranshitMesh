const Datastore = require('nedb-promises');
const path = require('path');

const dbDir = path.join(__dirname, '.data');

const db = {
  users: Datastore.create({ filename: path.join(dbDir, 'users.db'), autoload: true }),
  buses: Datastore.create({ filename: path.join(dbDir, 'buses.db'), autoload: true }),
  positions: Datastore.create({ filename: path.join(dbDir, 'positions.db'), autoload: true }),
  arrivals: Datastore.create({ filename: path.join(dbDir, 'arrivals.db'), autoload: true }),
  peers: Datastore.create({ filename: path.join(dbDir, 'peers.db'), autoload: true }),
};

// Ensure indexes
db.users.ensureIndex({ fieldName: 'email', unique: true });
db.buses.ensureIndex({ fieldName: 'busId', unique: true });
db.positions.ensureIndex({ fieldName: 'busId' });
db.arrivals.ensureIndex({ fieldName: 'busId' });
db.peers.ensureIndex({ fieldName: 'peerId', unique: true });

module.exports = db;
