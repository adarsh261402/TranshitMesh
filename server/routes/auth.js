const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

const router = express.Router();
const JWT_SECRET = 'transit-mesh-secret-key-2024';
const ADMIN_CODE = 'TRANSIT_ADMIN_2024';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
  next();
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, studentId, routePreference } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
    const existing = await db.users.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await db.users.insert({ name, email: email.toLowerCase(), password: hashed, role: 'student', studentId: studentId || '', routePreference: routePreference || '', lastSeen: new Date().toISOString(), networkMode: 'online' });
    const token = jwt.sign({ id: user._id, email: user.email, role: 'student', name }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name, email: user.email, role: 'student', studentId: user.studentId, routePreference: user.routePreference } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    await db.users.update({ _id: user._id }, { $set: { lastSeen: new Date().toISOString() } });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, studentId: user.studentId, routePreference: user.routePreference } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { email, password, adminCode } = req.body;
    if (!email || !password || !adminCode) return res.status(400).json({ error: 'All fields required' });
    if (adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'Invalid admin code' });
    const user = await db.users.findOne({ email: email.toLowerCase(), role: 'admin' });
    if (!user) return res.status(400).json({ error: 'Admin not found' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    await db.users.update({ _id: user._id }, { $set: { lastSeen: new Date().toISOString() } });
    const token = jwt.sign({ id: user._id, email: user.email, role: 'admin', name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: 'admin' } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await db.users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { password, ...safe } = user;
  res.json({ user: safe });
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.adminMiddleware = adminMiddleware;
