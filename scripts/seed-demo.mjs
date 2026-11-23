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
  ['Ceramiczny kubek Aurora', 'Ręcznie szkliwiony kubek kamionkowy, 350 ml.', 1850, 24, 'pcc-mug'],
  ['Lniana torba', 'Solidna torba z pranego lnu z wewnętrzną kieszenią.', 3200, 12, 'pcc-tote'],
  ['Bambusowa deska do krojenia', 'Przyjazna dla noży deska bambusowa, 30 × 20 cm.', 2790, 0, 'pcc-board'],
  ['Stalowa butelka termiczna', 'Podwójne ścianki, 750 ml, utrzymuje chłód przez 24 h.', 2200, 40, 'pcc-bottle'],
  ['Czapka wełniana', 'Miękka czapka z wełny merynosów, rozmiar uniwersalny.', 1675, 8, 'pcc-beanie'],
  ['Świeca sojowa zapachowa', 'Wosk sojowy o zapachu cedru i wanilii, czas palenia 45 h.', 1425, 30, 'pcc-candle'],
  ['Skórzany notatnik', 'Notatnik A5 z oprawą ze skóry z recyklingu.', 2499, 15, 'pcc-journal'],
  ['Emaliowany kubek turystyczny', 'Klasyczny nakrapiany kubek emaliowany, 300 ml.', 1240, 3, 'pcc-cup'],
  ['Płócienny plecak', 'Wodoodporne płótno, 20 l, kieszeń na laptopa.', 4800, 10, 'pcc-backpack'],
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
