import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { db, logSecurityEvent } from './db.js';
import { requireAdmin, createSessionAndToken } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const imagesRoot = path.join(rootDir, 'public', 'images');
const uploadsDir = path.join(imagesRoot, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);

function verifyImageMagicBytes(filePath, ext) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 4) return false;
  if (ext === '.jpg' || ext === '.jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === '.png') return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (ext === '.webp') return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  if (ext === '.svg') {
    const head = buf.toString('utf8', 0, Math.min(buf.length, 300)).toLowerCase();
    return head.includes('<svg') && !head.includes('<script');
  }
  return false;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 48);
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIMES.has(file.mimetype) || !ALLOWED_EXTS.has(ext)) {
      return cb(new Error('Only JPG, PNG, WEBP, or SVG images up to 5MB are allowed.'));
    }
    cb(null, true);
  },
});

const router = express.Router();

// One-time secure admin bootstrap (ONLY works when 0 admins exist in DB + setupKey matches JWT_SECRET)
router.get('/bootstrap-status', (_req, res) => {
  const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get().c;
  res.json({ needsSetup: adminCount === 0 });
});

router.post('/bootstrap', (req, res) => {
  const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get().c;
  if (adminCount > 0) {
    return res.status(403).json({ error: 'Admin account already initialized.' });
  }
  const { email, password, name = 'PRO PACKS Admin', setupKey } = req.body;
  const expectedKey = process.env.ADMIN_SETUP_KEY || process.env.JWT_SECRET || '';
  if (!expectedKey || setupKey !== expectedKey) {
    logSecurityEvent('ADMIN_BOOTSTRAP_DENIED', 'high', email || '', req.ip, 'Invalid setupKey');
    return res.status(403).json({ error: 'Invalid Setup Key. Use your JWT_SECRET from Hostinger env.' });
  }
  const strongRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;
  if (!email?.trim() || !strongRe.test(password || '')) {
    return res.status(400).json({ error: 'Valid email and strong password (10+ chars, Aa1!) required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'admin', 'active')"
  ).run(name.trim(), cleanEmail, hash);
  logSecurityEvent('ADMIN_BOOTSTRAPPED', 'info', cleanEmail, req.ip, 'Initial live admin created');
  res.status(201).json({ ok: true, message: 'Admin account created! You can now sign in.' });
});

// Admin Login (dedicated endpoint with role verification + audit log)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || 'unknown';
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

  if (!userRow || !bcrypt.compareSync(password, userRow.password_hash)) {
    logSecurityEvent('ADMIN_LOGIN_FAILED', 'warning', cleanEmail, ip, 'Invalid admin credentials');
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  if (userRow.role !== 'admin') {
    logSecurityEvent('ADMIN_UNAUTHORIZED_ATTEMPT', 'high', cleanEmail, ip, 'Non-admin user attempted admin login');
    return res.status(403).json({ error: 'Admin access denied.' });
  }
  if (userRow.status !== 'active') {
    logSecurityEvent('ADMIN_SUSPENDED_LOGIN', 'high', cleanEmail, ip, `Status: ${userRow.status}`);
    return res.status(403).json({ error: `Account is ${userRow.status}.` });
  }

  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(userRow.id);
  const user = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    status: userRow.status,
  };
  const token = createSessionAndToken(user, req);
  logSecurityEvent('ADMIN_LOGIN_SUCCESS', 'info', cleanEmail, ip, 'Admin signed in');
  res.json({ user, token });
});

// Protect all routes below with requireAdmin
router.use(requireAdmin);

// A. Overview
router.get('/overview', (_req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const publishedProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_published = 1').get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const revenueRow = db.prepare('SELECT COALESCE(SUM(total), 0) as rev FROM orders').get();
  const visitorsRow = db.prepare('SELECT COALESCE(SUM(views), 0) as v FROM visitor_stats').get();
  const failedLogins = db
    .prepare("SELECT COUNT(*) as c FROM security_logs WHERE severity IN ('warning', 'high')")
    .get().c;
  const activeSessions = db
    .prepare("SELECT COUNT(*) as c FROM sessions WHERE revoked = 0 AND expires_at > datetime('now')")
    .get().c;

  const recentOrders = db
    .prepare('SELECT id, order_number, guest_email, status, total, payment_method, created_at FROM orders ORDER BY id DESC LIMIT 6')
    .all();
  const recentLogs = db
    .prepare('SELECT * FROM security_logs ORDER BY id DESC LIMIT 8')
    .all();
  const dailyVisitors = db
    .prepare('SELECT date, views FROM visitor_stats ORDER BY date DESC LIMIT 14')
    .all();

  const maint = db.prepare("SELECT value FROM site_settings WHERE key = 'maintenance_mode'").get()?.value === 'true';

  res.json({
    stats: {
      totalVisitors: visitorsRow.v,
      totalUsers,
      totalProducts,
      publishedProducts,
      totalOrders,
      totalRevenue: Math.round(revenueRow.rev * 100) / 100,
      securityAlerts: failedLogins,
      activeSessions,
      maintenanceMode: maint,
    },
    recentOrders,
    recentLogs,
    dailyVisitors,
  });
});

// B & G. Website Content & Settings
router.get('/settings', (_req, res) => {
  const rows = db.prepare('SELECT key, value, updated_at FROM site_settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json({ settings });
});

router.put('/settings', (req, res) => {
  const updates = req.body?.settings || {};
  const upsert = db.prepare(
    "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  );
  db.exec('BEGIN');
  try {
    for (const [k, v] of Object.entries(updates)) {
      if (typeof k === 'string' && k.length <= 64) {
        upsert.run(k, String(v ?? ''));
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  logSecurityEvent('SETTINGS_UPDATED', 'info', req.user.email, req.ip, 'Updated site settings/SEO');
  res.json({ ok: true });
});

// FAQs management
router.get('/faqs', (_req, res) => {
  const faqs = db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC').all();
  res.json({ faqs });
});

router.post('/faqs', (req, res) => {
  const { category = 'ORDERING', question, answer, sortOrder = 0 } = req.body;
  if (!question?.trim() || !answer?.trim()) {
    return res.status(400).json({ error: 'Question and answer are required.' });
  }
  const info = db
    .prepare('INSERT INTO faqs (category, question, answer, sort_order) VALUES (?, ?, ?, ?)')
    .run(category.trim().toUpperCase(), question.trim(), answer.trim(), Number(sortOrder) || 0);
  const faq = db.prepare('SELECT * FROM faqs WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ faq });
});

router.put('/faqs/:id', (req, res) => {
  const { category, question, answer, sortOrder = 0 } = req.body;
  db.prepare('UPDATE faqs SET category = ?, question = ?, answer = ?, sort_order = ? WHERE id = ?').run(
    (category || 'ORDERING').trim().toUpperCase(),
    (question || '').trim(),
    (answer || '').trim(),
    Number(sortOrder) || 0,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/faqs/:id', (req, res) => {
  db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// C. User Management
router.get('/users', (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const role = String(req.query.role || '').trim().toLowerCase();
  const status = String(req.query.status || '').trim().toLowerCase();

  let users = db
    .prepare('SELECT id, name, email, phone, role, status, last_login, created_at FROM users ORDER BY id DESC')
    .all();

  if (search) {
    users = users.filter(
      (u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
    );
  }
  if (role) users = users.filter((u) => u.role === role);
  if (status) users = users.filter((u) => u.status === status);

  res.json({ users });
});

router.put('/users/:id', (req, res) => {
  const targetId = Number(req.params.id);
  const { role, status } = req.body;
  if (targetId === req.user.id && status && status !== 'active') {
    return res.status(400).json({ error: 'You cannot suspend your own active admin account.' });
  }
  if (role && !['customer', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  if (status && !['active', 'suspended', 'deactivated'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!current) return res.status(404).json({ error: 'User not found.' });

  const newRole = role || current.role;
  const newStatus = status || current.status;
  db.prepare('UPDATE users SET role = ?, status = ? WHERE id = ?').run(newRole, newStatus, targetId);

  if (newStatus !== 'active') {
    db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ?').run(targetId);
  }
  logSecurityEvent('USER_UPDATED', 'info', req.user.email, req.ip, `User #${targetId} -> role=${newRole}, status=${newStatus}`);
  res.json({ ok: true });
});

// D. Products & Categories Management
router.get('/products', (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim().toLowerCase();
  let rows = db.prepare('SELECT * FROM products ORDER BY id DESC').all();

  if (search) {
    rows = rows.filter(
      (p) => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search)
    );
  }
  if (category && category !== 'all') {
    rows = rows.filter((p) => p.category_slug === category);
  }
  const products = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    sku: r.sku,
    name: r.name,
    description: r.description,
    categorySlug: r.category_slug,
    categories: JSON.parse(r.categories_json),
    tags: JSON.parse(r.tags_json),
    badges: JSON.parse(r.badges_json),
    variants: JSON.parse(r.variants_json),
    images: JSON.parse(r.images_json),
    minPrice: r.min_price,
    maxPrice: r.max_price,
    stockQty: r.stock_qty,
    isNew: Boolean(r.is_new),
    isPublished: Boolean(r.is_published),
  }));
  res.json({ products });
});

router.post('/products', (req, res) => {
  const { name, sku, categorySlug = 'indoor', description = '', variants = [], images = [], tags = [], stockQty = 20, isNew = true, isPublished = true } = req.body;
  if (!name?.trim() || !variants.length) {
    return res.status(400).json({ error: 'Product name and at least one price tier are required.' });
  }
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Date.now().toString().slice(-4);
  const prices = variants.map((v) => Number(v.price) || 0);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const finalSku = sku?.trim() || `#PP-${Math.floor(100 + Math.random() * 899)}`;
  const cats = isNew && categorySlug !== 'todays-drop' ? [categorySlug, 'todays-drop'] : [categorySlug];

  const info = db
    .prepare(
      `INSERT INTO products (
        slug, sku, name, subtitle, description, category_slug,
        categories_json, tags_json, badges_json, variants_json, images_json,
        min_price, max_price, stock_qty, is_new, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      slug,
      finalSku,
      name.trim(),
      `${categorySlug.toUpperCase()} · ${finalSku}`,
      description.trim(),
      categorySlug,
      JSON.stringify(cats),
      JSON.stringify(tags),
      JSON.stringify(isNew ? ['NEW'] : []),
      JSON.stringify(variants),
      JSON.stringify(images),
      minP,
      maxP,
      Number(stockQty) || 0,
      isNew ? 1 : 0,
      isPublished ? 1 : 0
    );
  res.status(201).json({ id: info.lastInsertRowid, slug });
});

router.put('/products/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });

  const { name, sku, categorySlug, description, variants, images, tags, stockQty, isNew, isPublished } = req.body;
  const finalVariants = variants?.length ? variants : JSON.parse(existing.variants_json);
  const prices = finalVariants.map((v) => Number(v.price) || 0);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const cat = categorySlug || existing.category_slug;
  const newFlag = isNew !== undefined ? Boolean(isNew) : Boolean(existing.is_new);

  db.prepare(
    `UPDATE products SET
      name = ?, sku = ?, category_slug = ?, description = ?,
      variants_json = ?, images_json = ?, tags_json = ?,
      min_price = ?, max_price = ?, stock_qty = ?,
      is_new = ?, badges_json = ?, is_published = ?
    WHERE id = ?`
  ).run(
    name?.trim() || existing.name,
    sku?.trim() || existing.sku,
    cat,
    description !== undefined ? description.trim() : existing.description,
    JSON.stringify(finalVariants),
    JSON.stringify(images || JSON.parse(existing.images_json)),
    JSON.stringify(tags || JSON.parse(existing.tags_json)),
    minP,
    maxP,
    stockQty !== undefined ? Number(stockQty) : existing.stock_qty,
    newFlag ? 1 : 0,
    JSON.stringify(newFlag ? ['NEW'] : []),
    isPublished !== undefined ? (isPublished ? 1 : 0) : existing.is_published,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Categories management
router.get('/categories', (_req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all();
  res.json({ categories });
});

router.post('/categories', (req, res) => {
  const { name, description = '', badge = '', sortOrder = 50 } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Category name required.' });
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  db.prepare(
    'INSERT OR REPLACE INTO categories (slug, name, description, badge, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(slug, name.trim(), description.trim(), badge.trim().toUpperCase(), Number(sortOrder) || 50);
  res.status(201).json({ slug });
});

router.put('/categories/:slug', (req, res) => {
  const { name, description = '', badge = '', sortOrder = 50 } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Category name required.' });
  db.prepare(
    'UPDATE categories SET name = ?, description = ?, badge = ?, sort_order = ? WHERE slug = ?'
  ).run(name.trim(), description.trim(), badge.trim().toUpperCase(), Number(sortOrder) || 50, req.params.slug);
  res.json({ ok: true });
});

router.delete('/categories/:slug', (req, res) => {
  db.prepare('DELETE FROM categories WHERE slug = ?').run(req.params.slug);
  res.json({ ok: true });
});

// E. Media Management (strictly sandboxed to public/images)
function walkImages(dir, baseUrl = '/images', out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const url = `${baseUrl}/${entry.name}`;
    if (entry.isDirectory()) {
      walkImages(full, url, out);
    } else if (ALLOWED_EXTS.has(path.extname(entry.name).toLowerCase())) {
      const stat = fs.statSync(full);
      out.push({
        name: entry.name,
        url,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    }
  }
  return out;
}

router.get('/media', (_req, res) => {
  const files = walkImages(imagesRoot).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  res.json({ files });
});

router.post('/media/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const ext = path.extname(req.file.filename).toLowerCase();
    if (!verifyImageMagicBytes(req.file.path, ext)) {
      fs.unlinkSync(req.file.path);
      logSecurityEvent('INVALID_UPLOAD_BLOCKED', 'high', req.user.email, req.ip, req.file.originalname);
      return res.status(400).json({ error: 'File failed security signature verification.' });
    }
    const url = `/images/uploads/${req.file.filename}`;
    logSecurityEvent('MEDIA_UPLOADED', 'info', req.user.email, req.ip, url);
    res.status(201).json({ url, name: req.file.filename, size: req.file.size });
  });
});

// Multi-image secure upload for WordPress-style Product Editor
router.post('/products/upload', (req, res) => {
  upload.array('files', 8)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Please select at least one image.' });
    }
    const uploaded = [];
    for (const f of req.files) {
      const ext = path.extname(f.filename).toLowerCase();
      if (!verifyImageMagicBytes(f.path, ext)) {
        fs.unlinkSync(f.path);
        logSecurityEvent('INVALID_UPLOAD_BLOCKED', 'high', req.user.email, req.ip, f.originalname);
        continue;
      }
      uploaded.push(`/images/uploads/${f.filename}`);
    }
    if (uploaded.length === 0) {
      return res.status(400).json({ error: 'Uploaded files failed security signature verification.' });
    }
    logSecurityEvent('PRODUCT_MEDIA_UPLOADED', 'info', req.user.email, req.ip, `${uploaded.length} image(s)`);
    res.status(201).json({ urls: uploaded });
  });
});

router.delete('/media', (req, res) => {
  const relUrl = String(req.body?.url || '');
  if (!relUrl.startsWith('/images/')) {
    return res.status(400).json({ error: 'Invalid media path.' });
  }
  const relativePath = relUrl.replace(/^\/images\//, '');
  const resolved = path.resolve(imagesRoot, relativePath);
  // Strict directory traversal guard
  if (!resolved.startsWith(imagesRoot + path.sep)) {
    logSecurityEvent('PATH_TRAVERSAL_BLOCKED', 'high', req.user.email, req.ip, relUrl);
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (fs.existsSync(resolved)) {
    fs.unlinkSync(resolved);
  }
  res.json({ ok: true });
});

// F. Security Management
router.get('/security', (_req, res) => {
  const logs = db.prepare('SELECT * FROM security_logs ORDER BY id DESC LIMIT 60').all();
  const sessions = db
    .prepare(
      `SELECT s.id, s.user_id, s.role, s.ip, s.user_agent, s.expires_at, s.revoked, s.created_at, u.email, u.name
       FROM sessions s JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC LIMIT 40`
    )
    .all();
  res.json({ logs, sessions });
});

router.post('/sessions/:id/revoke', (req, res) => {
  db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').run(req.params.id);
  logSecurityEvent('SESSION_REVOKED', 'info', req.user.email, req.ip, `Revoked session ${req.params.id}`);
  res.json({ ok: true });
});

router.post('/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const strongRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;
  if (!strongRe.test(newPassword || '')) {
    return res.status(400).json({
      error: 'New password must be 10+ chars with uppercase, lowercase, number, and symbol.',
    });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  logSecurityEvent('ADMIN_PASSWORD_CHANGED', 'info', req.user.email, req.ip, 'Password updated');
  res.json({ ok: true });
});

// Orders & Contact Messages
router.get('/orders', (_req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 100').all();
  const orders = rows.map((o) => ({
    ...o,
    items: JSON.parse(o.items_json),
    shippingAddress: JSON.parse(o.shipping_address_json),
  }));
  res.json({ orders });
});

router.put('/orders/:id', (req, res) => {
  const { status, trackingNumber } = req.body;
  const allowed = ['confirmed', 'packed', 'in_transit', 'delivered', 'cancelled'];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status.' });
  }
  const ord = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!ord) return res.status(404).json({ error: 'Order not found.' });
  db.prepare("UPDATE orders SET status = ?, tracking_number = ?, updated_at = datetime('now') WHERE id = ?").run(
    status || ord.status,
    trackingNumber !== undefined ? trackingNumber.trim() : ord.tracking_number,
    req.params.id
  );
  res.json({ ok: true });
});

router.get('/messages', (_req, res) => {
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 50').all();
  res.json({ messages });
});

// H. Backup & Maintenance
router.get('/backup/database', (req, res) => {
  const dump = {
    exportedAt: new Date().toISOString(),
    categories: db.prepare('SELECT * FROM categories').all(),
    products: db.prepare('SELECT * FROM products').all(),
    site_settings: db.prepare('SELECT * FROM site_settings').all(),
    faqs: db.prepare('SELECT * FROM faqs').all(),
    coupons: db.prepare('SELECT * FROM coupons').all(),
    orders: db.prepare('SELECT * FROM orders').all(),
  };
  logSecurityEvent('DATABASE_BACKUP', 'info', req.user.email, req.ip, 'Exported JSON backup');
  res.setHeader('Content-Disposition', `attachment; filename="propacks-backup-${Date.now()}.json"`);
  res.json(dump);
});

router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    env: process.env.NODE_ENV || 'development',
  });
});

export default router;
