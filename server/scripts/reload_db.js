import { db, initDatabase } from '../db.js';

db.exec(`
  DELETE FROM wishlists;
  DELETE FROM reviews;
  DELETE FROM products;
  DELETE FROM categories;
`);

initDatabase();

const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
console.log('Database reloaded. Products:', count, 'Categories:', catCount);
