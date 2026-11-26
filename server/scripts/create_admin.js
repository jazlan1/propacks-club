import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from '../db.js';

initDatabase();

const email = (process.env.ADMIN_EMAIL || process.argv[2] || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || process.argv[3] || '';
const name = process.env.ADMIN_NAME || process.argv[4] || 'PRO PACKS Admin';

if (!email || !password) {
  console.error('Usage: node server/scripts/create_admin.js <email> <strong-password> [name]');
  console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
  process.exit(1);
}

const strongRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;
if (!strongRe.test(password)) {
  console.error(
    'Password must be at least 10 characters and include uppercase, lowercase, number, and special character.'
  );
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existing) {
  db.prepare("UPDATE users SET password_hash = ?, role = 'admin', status = 'active' WHERE id = ?").run(
    hash,
    existing.id
  );
  console.log(`Updated existing user ${email} to active admin.`);
} else {
  db.prepare(
    "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'admin', 'active')"
  ).run(name, email, hash);
  console.log(`Created new admin account for ${email}.`);
}
