import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db, initDatabase, logSecurityEvent } from './db.js';
import { signToken, requireAuth, optionalAuth } from './auth.js';
import adminRoutes from './adminRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

initDatabase();

const app = express();
app.set('trust proxy', 1);

// HTTP Security Headers & Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/admin/login', authLimiter);

// Admin Dashboard API routes
app.use('/api/admin', adminRoutes);

// Maintenance mode guard for public storefront APIs
app.use('/api', (req, res, next) => {
  if (
    req.path.startsWith('/admin') ||
    req.path.startsWith('/auth') ||
    req.path === '/health' ||
    req.path === '/site-config'
  ) {
    return next();
  }
  const maint = db.prepare("SELECT value FROM site_settings WHERE key = 'maintenance_mode'").get();
  if (maint?.value === 'true') {
    return res.status(503).json({ error: 'PRO PACKS is currently undergoing scheduled maintenance.' });
  }
  next();
});

// Serve extracted local product images with cache headers for fast repeat loads
app.use(
  '/images',
  express.static(path.join(rootDir, 'public', 'images'), {
    maxAge: '7d',
    etag: true,
  })
);

function formatProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    subtitle: row.subtitle,
    description: row.description,
    categorySlug: row.category_slug,
    categories: JSON.parse(row.categories_json),
    tags: JSON.parse(row.tags_json),
    badges: JSON.parse(row.badges_json),
    variants: JSON.parse(row.variants_json),
    images: JSON.parse(row.images_json),
    minPrice: row.min_price,
    maxPrice: row.max_price,
    compareAtPrice: row.compare_at_price,
    stockQty: row.stock_qty,
    rating: row.rating,
    reviewCount: row.review_count,
    isFeatured: Boolean(row.is_featured),
    isBestseller: Boolean(row.is_bestseller),
    isNew: Boolean(row.is_new),
    isSale: Boolean(row.is_sale),
  };
}

// Public Site Config, FAQs & Visitor Tracking
app.get('/api/site-config', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json({ settings });
});

app.get('/api/faqs', (_req, res) => {
  const faqs = db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC').all();
  res.json({ faqs });
});

app.post('/api/track-visit', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    'INSERT INTO visitor_stats (date, views) VALUES (?, 1) ON CONFLICT(date) DO UPDATE SET views = views + 1'
  ).run(today);
  res.json({ ok: true });
});

// Health check
app.get('/api/health', (_req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_published = 1').get().c;
  res.json({ status: 'ok', brand: 'PRO PACKS', totalProducts });
});

// Categories with live product counts
app.get('/api/categories', (_req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
  const allProducts = db.prepare('SELECT categories_json FROM products WHERE is_published = 1').all();
  const counts = {};
  for (const row of allProducts) {
    const arr = JSON.parse(row.categories_json);
    for (const c of arr) {
      counts[c] = (counts[c] || 0) + 1;
    }
  }
  const enriched = cats
    .map((c) => ({
      ...c,
      count: counts[c.slug] || 0,
    }))
    .filter((c) => c.count > 0);
  res.json({
    totalProducts: allProducts.length,
    categories: enriched,
  });
});

// Live search suggestions
app.get('/api/products/suggestions', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ suggestions: [] });
  const rows = db
    .prepare(
      `SELECT id, slug, sku, name, category_slug, min_price, images_json, badges_json
       FROM products
       WHERE is_published = 1 AND (LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(tags_json) LIKE ? OR LOWER(category_slug) LIKE ?)
       LIMIT 8`
    )
    .all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);

  const suggestions = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    sku: r.sku,
    name: r.name,
    categorySlug: r.category_slug,
    minPrice: r.min_price,
    image: JSON.parse(r.images_json)[0] || '',
    badges: JSON.parse(r.badges_json),
  }));
  res.json({ suggestions });
});

// Products listing with filtering, sorting, pagination
app.get('/api/products', (req, res) => {
  const {
    category = 'all',
    search = '',
    minPrice,
    maxPrice,
    tag = '',
    badge = '',
    inStock = '',
    sort = 'default',
    page = '1',
    limit = '24',
  } = req.query;

  let rows = db.prepare('SELECT * FROM products WHERE is_published = 1').all().map(formatProduct);

  if (category && category !== 'all') {
    const catLower = String(category).toLowerCase();
    if (catLower === 'specials' || catLower === 'special-deals') {
      rows = rows.filter(
        (p) => p.isSale || p.categories.includes('specials') || p.categories.includes('special-deals')
      );
    } else if (catLower === 'todays-drop') {
      rows = rows.filter((p) => p.categories.includes('todays-drop'));
    } else {
      rows = rows.filter(
        (p) => p.categorySlug === catLower || p.categories.includes(catLower)
      );
    }
  }

  if (search) {
    const q = String(search).trim().toLowerCase();
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.categorySlug.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (minPrice !== undefined && minPrice !== '') {
    const min = Number(minPrice);
    if (!Number.isNaN(min)) rows = rows.filter((p) => p.minPrice >= min);
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    const max = Number(maxPrice);
    if (!Number.isNaN(max)) rows = rows.filter((p) => p.minPrice <= max);
  }

  if (tag) {
    const t = String(tag).toLowerCase();
    rows = rows.filter((p) => p.tags.includes(t));
  }

  if (badge) {
    const b = String(badge).toUpperCase();
    rows = rows.filter((p) => p.badges.includes(b));
  }

  if (inStock === 'true') {
    rows = rows.filter((p) => p.stockQty > 0);
  }

  switch (sort) {
    case 'newest':
      rows.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.id - a.id);
      break;
    case 'price-asc':
      rows.sort((a, b) => a.minPrice - b.minPrice);
      break;
    case 'price-desc':
      rows.sort((a, b) => b.minPrice - a.minPrice);
      break;
    case 'rating':
      rows.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case 'bestseller':
      rows.sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller) || b.reviewCount - a.reviewCount);
      break;
    default:
      break;
  }

  const total = rows.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 24));
  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  const start = (pageNum - 1) * limitNum;
  const paginated = rows.slice(start, start + limitNum);

  res.json({
    products: paginated,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
  });
});

// Single product detail + related + reviews
app.get('/api/products/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Product not found' });

  const product = formatProduct(row);
  const reviews = db
    .prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC, id DESC')
    .all(product.id);

  const relatedRows = db
    .prepare('SELECT * FROM products WHERE category_slug = ? AND id != ? LIMIT 8')
    .all(product.categorySlug, product.id);
  const related = relatedRows.map(formatProduct);

  res.json({ product, reviews, related });
});

// Submit product review
app.post('/api/products/:slug/reviews', optionalAuth, (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE slug = ?').get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { authorName, rating, title, comment } = req.body;
  const numRating = Number(rating);
  if (!title?.trim() || !comment?.trim() || !(numRating >= 1 && numRating <= 5)) {
    return res.status(400).json({ error: 'Please provide a rating (1-5), title, and review comment.' });
  }

  const name = req.user?.name || authorName?.trim() || 'Verified Buyer';
  const info = db
    .prepare(
      'INSERT INTO reviews (product_id, user_id, author_name, rating, title, comment, verified_purchase) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(product.id, req.user?.id || null, name, numRating, title.trim(), comment.trim(), req.user ? 1 : 0);

  const stats = db
    .prepare('SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM reviews WHERE product_id = ?')
    .get(product.id);
  db.prepare('UPDATE products SET rating = ?, review_count = ? WHERE id = ?').run(
    Math.round((stats.avg_r || 5) * 10) / 10,
    stats.cnt,
    product.id
  );

  const created = db.prepare('SELECT * FROM reviews WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ review: created });
});

// Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone = '' } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, valid email, and password (min 6 chars) are required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)')
    .run(name.trim(), cleanEmail, hash, phone.trim());

  const user = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user, req);
  logSecurityEvent('USER_REGISTERED', 'info', cleanEmail, req.ip, 'New customer registered');
  res.status(201).json({ user, token });
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  if (!userRow || !bcrypt.compareSync(password, userRow.password_hash)) {
    logSecurityEvent('LOGIN_FAILED', 'warning', cleanEmail, req.ip, 'Invalid email or password');
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (userRow.status !== 'active') {
    logSecurityEvent('SUSPENDED_LOGIN_ATTEMPT', 'high', cleanEmail, req.ip, `Status: ${userRow.status}`);
    return res.status(403).json({ error: `Account is ${userRow.status}. Contact support.` });
  }
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(userRow.id);
  const user = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    phone: userRow.phone,
    role: userRow.role,
    created_at: userRow.created_at,
  };
  const token = signToken(user, req);
  res.json({ user, token });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  if (req.user?.jti) {
    db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').run(req.user.jti);
  }
  res.json({ ok: true });
});

// Auth: Forgot / Reset password
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required.' });
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  const token = crypto.randomBytes(16).toString('hex');
  if (user) {
    db.prepare('UPDATE users SET reset_token = ? WHERE id = ?').run(token, user.id);
  }
  res.json({
    message: 'If an account matches that email, a password reset code has been generated.',
    resetCode: user ? token : undefined,
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, resetCode, newPassword } = req.body;
  if (!email?.trim() || !resetCode?.trim() || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Email, reset code, and new password (min 6 chars) are required.' });
  }
  const user = db
    .prepare('SELECT id FROM users WHERE email = ? AND reset_token = ?')
    .get(email.trim().toLowerCase(), resetCode.trim());
  if (!user) {
    return res.status(400).json({ error: 'Invalid email or reset code.' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL WHERE id = ?').run(hash, user.id);
  res.json({ message: 'Password updated successfully. You can now sign in.' });
});

// Auth: Current user profile
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

app.put('/api/auth/me', requireAuth, (req, res) => {
  const { name, phone } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required.' });
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(
    name.trim(),
    (phone || '').trim(),
    req.user.id
  );
  const user = db
    .prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  res.json({ user });
});

// Saved Addresses
app.get('/api/addresses', requireAuth, (req, res) => {
  const addresses = db
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
    .all(req.user.id);
  res.json({ addresses });
});

app.post('/api/addresses', requireAuth, (req, res) => {
  const { label, fullName, street, apt = '', city, state, zip, country = 'US', phone = '', isDefault = false } = req.body;
  if (!label?.trim() || !fullName?.trim() || !street?.trim() || !city?.trim() || !state?.trim() || !zip?.trim()) {
    return res.status(400).json({ error: 'Please complete all required address fields.' });
  }
  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }
  const info = db
    .prepare(
      `INSERT INTO addresses (user_id, label, full_name, street, apt, city, state, zip, country, phone, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, label.trim(), fullName.trim(), street.trim(), apt.trim(), city.trim(), state.trim(), zip.trim(), country, phone.trim(), isDefault ? 1 : 0);

  const address = db.prepare('SELECT * FROM addresses WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ address });
});

app.delete('/api/addresses/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// Wishlist
app.get('/api/wishlist', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.* FROM products p
       JOIN wishlists w ON w.product_id = p.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`
    )
    .all(req.user.id);
  res.json({ products: rows.map(formatProduct) });
});

app.post('/api/wishlist/toggle', requireAuth, (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const exists = db
    .prepare('SELECT 1 FROM wishlists WHERE user_id = ? AND product_id = ?')
    .get(req.user.id, productId);
  if (exists) {
    db.prepare('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);
    res.json({ saved: false });
  } else {
    db.prepare('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)').run(req.user.id, productId);
    res.json({ saved: true });
  }
});

// Coupons
app.get('/api/coupons', (_req, res) => {
  const coupons = db.prepare('SELECT code, type, value, min_order, description FROM coupons WHERE active = 1').all();
  res.json({ coupons });
});

app.post('/api/coupons/validate', (req, res) => {
  const { code, subtotal = 0 } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: 'Enter a promo code.' });
  const coupon = db
    .prepare('SELECT * FROM coupons WHERE UPPER(code) = ? AND active = 1')
    .get(code.trim().toUpperCase());
  if (!coupon) return res.status(404).json({ error: 'Invalid or expired promo code.' });
  if (Number(subtotal) < coupon.min_order) {
    return res.status(400).json({
      error: `Minimum order of $${coupon.min_order.toFixed(2)} required for ${coupon.code}.`,
    });
  }
  let discount = 0;
  if (coupon.type === 'percent') discount = Math.round(Number(subtotal) * (coupon.value / 100) * 100) / 100;
  if (coupon.type === 'fixed') discount = coupon.value;
  res.json({
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      discount,
    },
  });
});

// Orders
app.post('/api/orders', optionalAuth, (req, res) => {
  const {
    email,
    items,
    shippingAddress,
    shippingMethod = 'Standard Ground',
    paymentMethod = 'Card',
    couponCode = '',
    notes = '',
  } = req.body;

  if (!email?.trim() || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Email and at least one cart item are required.' });
  }
  if (!shippingAddress?.fullName || !shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.state || !shippingAddress?.zip) {
    return res.status(400).json({ error: 'Complete shipping address is required.' });
  }

  let subtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    const prod = db.prepare('SELECT * FROM products WHERE id = ? OR slug = ?').get(item.productId || 0, item.slug || '');
    if (!prod) return res.status(400).json({ error: `Product not found: ${item.name || item.slug}` });
    const variants = JSON.parse(prod.variants_json);
    const matchedVariant = variants.find((v) => v.label === item.variantLabel) || variants[0];
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    if (prod.stock_qty < qty) {
      return res.status(400).json({ error: `Insufficient stock for ${prod.name}. Only ${prod.stock_qty} left.` });
    }
    const linePrice = matchedVariant.price;
    subtotal += linePrice * qty;
    verifiedItems.push({
      productId: prod.id,
      slug: prod.slug,
      sku: prod.sku,
      name: prod.name,
      variantLabel: matchedVariant.label,
      price: linePrice,
      quantity: qty,
      image: JSON.parse(prod.images_json)[0] || '',
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;

  // Shipping calculation
  let shippingCost = 0;
  if (shippingMethod === 'Overnight Cold-Chain') shippingCost = 45;
  else if (shippingMethod === 'Express Priority') shippingCost = subtotal >= 500 ? 0 : 25;
  else shippingCost = subtotal >= 300 ? 0 : 15;

  // Coupon calculation
  let discountAmount = 0;
  let appliedCode = '';
  if (couponCode?.trim()) {
    const coupon = db
      .prepare('SELECT * FROM coupons WHERE UPPER(code) = ? AND active = 1')
      .get(couponCode.trim().toUpperCase());
    if (coupon && subtotal >= coupon.min_order) {
      appliedCode = coupon.code;
      if (coupon.type === 'percent') discountAmount = Math.round(subtotal * (coupon.value / 100) * 100) / 100;
      else if (coupon.type === 'fixed') discountAmount = coupon.value;
      else if (coupon.type === 'shipping') shippingCost = 0;
    }
  }

  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxable * 0.0 * 100) / 100; // Wholesale / tax-exempt included
  const total = Math.round((taxable + shippingCost + taxAmount) * 100) / 100;

  const orderNumber = `PP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const trackingNumber = `1Z999AA10${Math.floor(10000000 + Math.random() * 89999999)}`;

  db.exec('BEGIN');
  try {
    db.prepare(`
      INSERT INTO orders (
        order_number, user_id, guest_email, status, items_json,
        shipping_address_json, shipping_method, payment_method, coupon_code,
        subtotal, discount_amount, shipping_cost, tax_amount, total, notes, tracking_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber,
      req.user?.id || null,
      email.trim().toLowerCase(),
      'confirmed',
      JSON.stringify(verifiedItems),
      JSON.stringify(shippingAddress),
      shippingMethod,
      paymentMethod,
      appliedCode,
      subtotal,
      discountAmount,
      shippingCost,
      taxAmount,
      total,
      notes.trim(),
      trackingNumber
    );

    for (const vi of verifiedItems) {
      db.prepare('UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?').run(vi.quantity, vi.productId);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);
  res.status(201).json({
    order: {
      ...order,
      items: JSON.parse(order.items_json),
      shippingAddress: JSON.parse(order.shipping_address_json),
    },
  });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .all(req.user.id);
  const orders = rows.map((o) => ({
    ...o,
    items: JSON.parse(o.items_json),
    shippingAddress: JSON.parse(o.shipping_address_json),
  }));
  res.json({ orders });
});

app.get('/api/orders/:orderNumber', optionalAuth, (req, res) => {
  const order = db
    .prepare('SELECT * FROM orders WHERE UPPER(order_number) = ?')
    .get(req.params.orderNumber.toUpperCase());
  if (!order) return res.status(404).json({ error: 'Order not found' });

  res.json({
    order: {
      ...order,
      items: JSON.parse(order.items_json),
      shippingAddress: JSON.parse(order.shipping_address_json),
    },
  });
});

// Newsletter
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;
  if (!email?.trim() || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const clean = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(clean);
  if (!existing) {
    db.prepare('INSERT INTO newsletter_subscribers (email) VALUES (?)').run(clean);
  }
  res.json({ message: 'Subscribed! Use code PROPACK10 for 10% off your first drop.' });
});

// Contact form
app.post('/api/contact', (req, res) => {
  const { name, email, subject, orderNumber = '', message } = req.body;
  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Please fill out all required fields.' });
  }
  db.prepare(
    'INSERT INTO contact_messages (name, email, subject, order_number, message) VALUES (?, ?, ?, ?, ?)'
  ).run(name.trim(), email.trim(), subject.trim(), orderNumber.trim(), message.trim());
  res.status(201).json({ message: 'Message received. Our LA dispatch team will reply within 2 hours.' });
});

// Dynamic XML Sitemap for SEO
app.get('/sitemap.xml', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  const staticRoutes = ['/', '/menu', '/deals', '/about', '/faq', '/contact', '/track-order'];
  const cats = db.prepare('SELECT slug FROM categories').all();
  const prods = db.prepare('SELECT slug, created_at FROM products').all();

  const urls = [
    ...staticRoutes.map((r) => `<url><loc>${origin}${r}</loc><changefreq>daily</changefreq><priority>${r === '/' ? '1.0' : '0.8'}</priority></url>`),
    ...cats.map((c) => `<url><loc>${origin}/menu/${c.slug}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`),
    ...prods.map((p) => `<url><loc>${origin}/product/${p.slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`),
  ];

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
  );
});

// Serve production SPA if dist/ exists
const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  app.use(
    '/assets',
    express.static(path.join(distDir, 'assets'), {
      maxAge: '365d',
      immutable: true,
    })
  );
  app.use(express.static(path.join(rootDir, 'public'), { maxAge: '7d' }));
  app.use(express.static(distDir, { maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Safe global error handler (never leaks internal stack traces)
app.use((err, _req, res, _next) => {
  console.error('Server error:', err?.message || err);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PRO PACKS API server running on http://localhost:${PORT}`);
});
