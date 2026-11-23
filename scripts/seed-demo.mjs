// scripts/seed-demo.mjs — idempotent demo data. Usage:
//   DATABASE_PATH=.data/demo.db node scripts/seed-demo.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const file = process.env.DATABASE_PATH ?? '.data/app.db';
fs.mkdirSync(path.dirname(file), { recursive: true });
const db = new Database(file);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(process.cwd(), 'src/db/schema.sql'), 'utf8'));

const PRODUCTS = [
  ['Aurora Ceramic Mug', 'Hand-glazed stoneware mug, 350 ml.', 1850, 24, 'pcc-mug'],
  ['Linen Tote Bag', 'Sturdy washed-linen tote with inner pocket.', 3200, 12, 'pcc-tote'],
  ['Bamboo Cutting Board', 'Knife-friendly bamboo board, 30 x 20 cm.', 2790, 0, 'pcc-board'],
  ['Stainless Water Bottle', 'Double-walled, 750 ml, keeps cold 24 h.', 2200, 40, 'pcc-bottle'],
  ['Wool Beanie', 'Soft merino beanie, one size.', 1675, 8, 'pcc-beanie'],
  ['Scented Soy Candle', 'Cedar & vanilla soy wax, 45 h burn time.', 1425, 30, 'pcc-candle'],
  ['Leather Journal', 'A5 journal with recycled-leather cover.', 2499, 15, 'pcc-journal'],
  ['Enamel Camp Cup', 'Classic speckled enamel cup, 300 ml.', 1240, 3, 'pcc-cup'],
  ['Canvas Backpack', 'Water-resistant canvas, 20 l, laptop sleeve.', 4800, 10, 'pcc-backpack'],
];

const insertProduct = db.prepare(`
  INSERT INTO products (name, description, price_cents, stock, photos)
  SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ?)`);

for (const [name, description, priceCents, stock, seedBase] of PRODUCTS) {
  const photos = JSON.stringify([1, 2, 3].map((i) => `https://picsum.photos/400/400?seed=${seedBase}-${i}`));
  insertProduct.run(name, description, priceCents, stock, photos, name);
}

const password = process.env.DEMO_USER_PASSWORD ?? 'Shopper-Docs-1';
const hash = bcrypt.hashSync(password, 10);
db.prepare(`
  INSERT INTO users (email, username, password_hash, role)
  SELECT 'shopper@piccart.test', 'shopper', ?, 'user'
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'shopper@piccart.test')`).run(hash);

console.log(`Seeded demo data into ${file}`);
db.close();
