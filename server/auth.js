import 'dotenv/config';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) {
    return process.env.JWT_SECRET;
  }
  const secretFile = path.join(__dirname, 'data', '.jwt_secret');
  if (fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, 'utf8').trim();
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(secretFile), { recursive: true });
  fs.writeFileSync(secretFile, generated, { mode: 0o600 });
  return generated;
}

const JWT_SECRET = resolveJwtSecret();

export function createSessionAndToken(user, req) {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown';
  const ua = (req?.headers?.['user-agent'] || '').slice(0, 200);

  db.prepare(
    'INSERT INTO sessions (id, user_id, role, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(jti, user.id, user.role, String(ip), ua, expiresAt);

  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, jti },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function signToken(user, req) {
  return createSessionAndToken(user, req);
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function validateSessionAndUser(decoded) {
  if (decoded.jti) {
    const sess = db
      .prepare('SELECT revoked, expires_at FROM sessions WHERE id = ?')
      .get(decoded.jti);
    if (!sess || sess.revoked || new Date(sess.expires_at) < new Date()) {
      return { error: 'Session expired or revoked' };
    }
  }
  const userRow = db
    .prepare('SELECT id, name, email, role, status FROM users WHERE id = ?')
    .get(decoded.id);
  if (!userRow) return { error: 'Account not found' };
  if (userRow.status !== 'active') return { error: `Account is ${userRow.status}` };
  return { user: { ...decoded, role: userRow.role, name: userRow.name } };
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = verifyToken(token);
    const check = validateSessionAndUser(decoded);
    if (check.error) return res.status(401).json({ error: check.error });
    req.user = check.user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    next();
  });
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const decoded = verifyToken(token);
      const check = validateSessionAndUser(decoded);
      if (!check.error) req.user = check.user;
    } catch {
      req.user = null;
    }
  }
  next();
}
