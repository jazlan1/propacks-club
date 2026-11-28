import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'propacks.db');
const catalogPath = path.join(dataDir, 'products_catalog.json');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      badge TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      description TEXT NOT NULL,
      category_slug TEXT NOT NULL,
      categories_json TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      badges_json TEXT NOT NULL,
      variants_json TEXT NOT NULL,
      images_json TEXT NOT NULL,
      min_price REAL NOT NULL,
      max_price REAL NOT NULL,
      compare_at_price REAL,
      stock_qty INTEGER NOT NULL DEFAULT 20,
      rating REAL NOT NULL DEFAULT 4.8,
      review_count INTEGER NOT NULL DEFAULT 5,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_bestseller INTEGER NOT NULL DEFAULT 0,
      is_new INTEGER NOT NULL DEFAULT 0,
      is_sale INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT DEFAULT '',
      role TEXT DEFAULT 'customer',
      reset_token TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      full_name TEXT NOT NULL,
      street TEXT NOT NULL,
      apt TEXT DEFAULT '',
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip TEXT NOT NULL,
      country TEXT DEFAULT 'US',
      phone TEXT DEFAULT '',
      is_default INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      guest_email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      items_json TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      shipping_method TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      coupon_code TEXT DEFAULT '',
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      shipping_cost REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      notes TEXT DEFAULT '',
      tracking_number TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      verified_purchase INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      min_order REAL NOT NULL DEFAULT 0,
      description TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      order_number TEXT DEFAULT '',
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      expires_at TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      email TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS visitor_stats (
      date TEXT PRIMARY KEY,
      views INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Safe migrations for existing tables
  const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userCols.includes('status')) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
  }
  if (!userCols.includes('last_login')) {
    db.exec('ALTER TABLE users ADD COLUMN last_login TEXT DEFAULT NULL');
  }

  const prodCols = db.prepare('PRAGMA table_info(products)').all().map((c) => c.name);
  if (!prodCols.includes('is_published')) {
    db.exec('ALTER TABLE products ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1');
  }

  seedCategories();
  seedProducts();
  seedCoupons();
  seedDemoUser();
  seedSiteSettings();
  seedFaqs();
}

function seedCategories() {
  const count = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (count > 0) return;

  const cats = [
    ['todays-drop', "Today's Drop", 'Freshly landed batches and top-priority drops.', 'NEW', 1],
    ['carts', 'Disposables & Vapes', '2G & 3G live resin, liquid diamond, and dual-chamber disposables.', '', 2],
    ['indoor', 'Indoor Flower', 'Climate-controlled indoor flower with dense trichomes and loud terps.', '', 3],
    ['mixed-light', 'Mixed Light', 'Sun-assisted greenhouse harvests at bulk-friendly tiers.', '', 4],
    ['exotic', 'Exotic', 'Top-tier rare genetics and small-batch exotic indoor.', '', 5],
    ['wax', 'Wax & Badder', 'Live resin badder, sugar, shatter, and lootbox concentrates.', '', 6],
    ['terp', 'Rosin & Hash', 'Solventless rosin pucks and 120u dry sift hash bricks.', '', 7],
    ['prerolls', 'Pre-Rolls & Hash Holes', 'Rosin-infused hash holes and exotic flower joints.', '', 8],
    ['personal-smoke', '1/8ths & Packs', 'Pre-packaged 3.5g jars and curated retail-ready units.', '', 9],
    ['smalls', 'Smalls', 'High-value indoor smalls with full terpene profile.', '', 10],
  ];

  const insert = db.prepare(
    'INSERT INTO categories (slug, name, description, badge, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  for (const c of cats) {
    insert.run(...c);
  }
}

function seedProducts() {
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (count > 0) return;
  if (!fs.existsSync(catalogPath)) return;

  const items = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  const insert = db.prepare(`
    INSERT INTO products (
      slug, sku, name, subtitle, description, category_slug,
      categories_json, tags_json, badges_json, variants_json, images_json,
      min_price, max_price, compare_at_price, stock_qty, rating, review_count,
      is_featured, is_bestseller, is_new, is_sale
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReview = db.prepare(`
    INSERT INTO reviews (product_id, author_name, rating, title, comment, verified_purchase)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  const sampleReviews = [
    ['Marcus V.', 5, 'Triple-sealed & loud right out the bag', 'Nose hit immediately when I cracked the first seal. Cure is dialed in, zero shake, exact weight on the scale.'],
    ['Elena R.', 5, 'Consistent every single drop', 'Ordered a HP on Tuesday and tracking updated the same afternoon. PRO PACKS never misses on freshness.'],
    ['Devon K.', 4, 'Clean smoke, white ash', 'Great bag appeal and sticky structure. Will definitely be grabbing a full P on the next restock.'],
  ];

  db.exec('BEGIN');
  try {
    items.forEach((p, idx) => {
      const res = insert.run(
        p.slug,
        p.sku,
        p.name,
        p.subtitle,
        p.description,
        p.category_slug,
        JSON.stringify(p.categories),
        JSON.stringify(p.tags),
        JSON.stringify(p.badges),
        JSON.stringify(p.variants),
        JSON.stringify(p.images),
        p.min_price,
        p.max_price,
        p.compare_at_price,
        p.stock_qty,
        p.rating,
        p.review_count,
        p.is_featured ? 1 : 0,
        p.is_bestseller ? 1 : 0,
        p.is_new ? 1 : 0,
        p.is_sale ? 1 : 0
      );
      if (idx < 24) {
        const rev = sampleReviews[idx % sampleReviews.length];
        insertReview.run(res.lastInsertRowid, rev[0], rev[1], rev[2], rev[3]);
      }
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function seedCoupons() {
  const count = db.prepare('SELECT COUNT(*) as c FROM coupons').get().c;
  if (count > 0) return;
  const insert = db.prepare(
    'INSERT INTO coupons (code, type, value, min_order, description, active) VALUES (?, ?, ?, ?, ?, 1)'
  );
  insert.run('PROPACK10', 'percent', 10, 0, '10% off your entire PRO PACKS order');
  insert.run('FIRSTDROP', 'fixed', 25, 200, '$25 off orders of $200 or more');
  insert.run('BULK50', 'fixed', 50, 500, '$50 off bulk orders of $500 or more');
  insert.run('FREESHIP', 'shipping', 0, 150, 'Free Express Priority shipping on orders $150+');
}

function seedDemoUser() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@propacks.club');
  if (existing) return;

  const hash = bcrypt.hashSync('ProPacks2026!', 10);
  const res = db.prepare(
    'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)'
  ).run('Alex Mercer', 'demo@propacks.club', hash, '(323) 555-0194', 'customer');

  const userId = res.lastInsertRowid;
  db.prepare(`
    INSERT INTO addresses (user_id, label, full_name, street, apt, city, state, zip, country, phone, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(userId, 'LA Studio', 'Alex Mercer', '742 Mateo St', 'Suite 4B', 'Los Angeles', 'CA', '90021', 'US', '(323) 555-0194');

  const sampleProduct = db.prepare('SELECT id, slug, sku, name, images_json, variants_json FROM products LIMIT 1').get();
  if (sampleProduct) {
    const variants = JSON.parse(sampleProduct.variants_json);
    const images = JSON.parse(sampleProduct.images_json);
    const v = variants[0];
    const items = [{
      productId: sampleProduct.id,
      slug: sampleProduct.slug,
      sku: sampleProduct.sku,
      name: sampleProduct.name,
      variantLabel: v.label,
      price: v.price,
      quantity: 2,
      image: images[0] || ''
    }];
    const subtotal = v.price * 2;
    db.prepare(`
      INSERT INTO orders (
        order_number, user_id, guest_email, status, items_json,
        shipping_address_json, shipping_method, payment_method, coupon_code,
        subtotal, discount_amount, shipping_cost, tax_amount, total, tracking_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'PP-2026-8410',
      userId,
      'demo@propacks.club',
      'in_transit',
      JSON.stringify(items),
      JSON.stringify({
        fullName: 'Alex Mercer',
        street: '742 Mateo St',
        apt: 'Suite 4B',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90021',
        country: 'US',
        phone: '(323) 555-0194'
      }),
      'Express Priority',
      'Zelle',
      '',
      subtotal,
      0,
      0,
      0,
      subtotal,
      '1Z999AA10192837465'
    );
  }
}

function seedSiteSettings() {
  const defaults = [
    ['site_name', 'PRO PACKS'],
    ['tagline', 'SEALED · CURED · CERTIFIED · EST. 2023'],
    ['hero_badge', 'SEALED PACKS · LOS ANGELES · EST. 2023'],
    ['hero_title', 'BAGGED. SEALED. DELIVERED.'],
    [
      'hero_subtitle',
      "LA's premier craft bulk source. Every batch is hang-dried, jar-cured, and triple vacuum-sealed before it leaves our room.",
    ],
    ['how_to_order_title', 'HOW TO ORDER'],
    ['how_to_order_step1', '1. Add Items to Your Cart'],
    ['how_to_order_step2', '2. Screenshot your Cart'],
    ['how_to_order_step3', '3. Send to us on Signal Or Telegram'],
    [
      'order_disclaimer',
      'No Re-ships for wrong address. Please specify payment method and ensure your info is correct. Non-refundable policy',
    ],
    [
      'marquee_text',
      '★ PRO PACKS · LA DIRECT BULK DROPS   ★ NEW DROPS EVERY DAY   ★ 10% OFF FIRST ORDER WITH CODE PROPACK10   ★ FREE SHIPPING ON ORDERS $300+   ★ TRIPLE VACUUM-SEALED & TRACKED',
    ],
    [
      'signal_url',
      'https://signal.me/#eu/9dXJPXo_xyWTgcxgrb1mjbv9WvPNjH21q2MFb_0pM8M4TtTwbI5B-JIKdmHW_Ka0',
    ],
    ['telegram_url', 'https://t.me/Distroactive247'],
    ['contact_email', 'support@propacks.club'],
    ['hours', '9:00 AM – 8:30 PM PST Daily'],
    ['seo_title', 'PRO PACKS — Sealed. Cured. Delivered. | LA Craft & Bulk Drops'],
    [
      'seo_description',
      "PRO PACKS is LA's premier bulk flower, disposables, and craft concentrates source. Hand-selected drops, triple vacuum-sealed freshness, and fast tracked delivery.",
    ],
    [
      'seo_keywords',
      'PRO PACKS, bulk flower, indoor flower, exotic strains, live resin disposables, concentrates, Los Angeles',
    ],
    ['og_image', '/images/propacks-logo.jpg'],
    ['maintenance_mode', 'false'],
  ];

  const insert = db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)');
  for (const [k, v] of defaults) {
    insert.run(k, v);
  }
}

function seedFaqs() {
  const count = db.prepare('SELECT COUNT(*) as c FROM faqs').get().c;
  if (count > 0) return;
  const rows = [
    ['SHIPPING & HANDLING', 'When does my order ship?', 'All confirmed orders placed before 4:00 PM PST ship the same business day. Orders placed after 4:00 PM PST ship first thing the next morning.', 1],
    ['SHIPPING & HANDLING', 'How is my order packaged?', 'Every batch is jar-cured, placed in a heavy-duty barrier bag, and triple vacuum-sealed with zero external odor or branding.', 2],
    ['SHIPPING & HANDLING', 'Do orders come with tracking & insurance?', 'Yes. Every PRO PACKS order receives a live tracking number immediately upon dispatch and full transit protection.', 3],
    ['ORDERING', 'How do I place an order on PRO PACKS?', 'Browse the Menu, pick your weight tier (QP, HP, LB, or unit), add items to your cart, apply any promo code, and complete checkout online.', 4],
    ['ORDERING', 'How often do you drop new products?', 'We restock and drop fresh indoor, exotic, and cart batches daily. Check Today’s Drop or subscribe to our newsletter for alerts.', 5],
    ['PAYMENT', 'What payment methods do you accept?', 'We accept Cash App, Zelle, Apple Pay, and Crypto.', 6],
  ];
  const insert = db.prepare('INSERT INTO faqs (category, question, answer, sort_order) VALUES (?, ?, ?, ?)');
  for (const r of rows) insert.run(...r);
}

export function logSecurityEvent(eventType, severity, email = '', ip = '', details = '') {
  try {
    db.prepare(
      'INSERT INTO security_logs (event_type, severity, email, ip, details) VALUES (?, ?, ?, ?, ?)'
    ).run(eventType, severity, String(email).slice(0, 120), String(ip).slice(0, 64), String(details).slice(0, 300));
  } catch {
    // Non-blocking audit log
  }
}
