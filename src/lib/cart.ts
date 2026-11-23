import { getDb } from '@/db';
import { MAX_QTY_PER_LINE } from './constants';
import type { CartLine, CartView, StockConflict } from './types';

type LineRow = {
  product_id: number;
  name: string;
  qty: number;
  price_cents: number;
  stock: number;
  photos: string;
};

function cartView(user: number): CartView {
  const rows = getDb()
    .prepare(
      `SELECT c.product_id, p.name, c.qty, p.price_cents, p.stock, p.photos
       FROM cart_items c JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ?
       ORDER BY c.product_id ASC`,
    )
    .all(user) as LineRow[];
  const items: CartLine[] = rows.map((r) => ({
    productId: r.product_id,
    name: r.name,
    qty: r.qty,
    unitPriceCents: r.price_cents,
    lineTotalCents: r.qty * r.price_cents,
    stock: r.stock,
    photo: (JSON.parse(r.photos) as string[])[0],
  }));
  return {
    items,
    totalQty: items.reduce((s, i) => s + i.qty, 0),
    subtotalCents: items.reduce((s, i) => s + i.lineTotalCents, 0),
  };
}

export function getCart(user: number): CartView {
  return cartView(user);
}

export type CartResult =
  | { ok: true; cart: CartView }
  | { ok: false; code: 'NOT_FOUND' | 'LIMIT_PER_LINE' | 'STOCK_CONFLICT'; conflicts?: StockConflict[] };

function productExists(id: number): boolean {
  const row = getDb().prepare('SELECT id FROM products WHERE id = ?').get(id);
  return row !== undefined;
}

export function addToCart(user: number, input: { productId: number; qty: number }): CartResult {
  if (!Number.isInteger(input.productId) || input.productId < 1 || !productExists(input.productId)) {
    return { ok: false, code: 'NOT_FOUND' };
  }
  if (!Number.isInteger(input.qty) || input.qty < 1 || input.qty > MAX_QTY_PER_LINE) {
    return { ok: false, code: 'LIMIT_PER_LINE' };
  }
  const d = getDb();
  const existing = d
    .prepare('SELECT qty FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(user, input.productId) as { qty: number } | undefined;
  const target = (existing?.qty ?? 0) + input.qty;
  if (target > MAX_QTY_PER_LINE) {
    return { ok: false, code: 'LIMIT_PER_LINE' };
  }
  const product = d.prepare('SELECT name, stock FROM products WHERE id = ?').get(input.productId) as {
    name: string; stock: number;
  };
  if (target > product.stock) {
    return {
      ok: false,
      code: 'STOCK_CONFLICT',
      conflicts: [{ productId: input.productId, name: product.name, requested: target, available: product.stock }],
    };
  }
  d.prepare(
    `INSERT INTO cart_items (user_id, product_id, qty) VALUES (?, ?, ?)
     ON CONFLICT (user_id, product_id) DO UPDATE SET qty = excluded.qty`,
  ).run(user, input.productId, target);
  return { ok: true, cart: cartView(user) };
}

export function setCartQty(user: number, productId: number, qty: number): CartResult {
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
    return { ok: false, code: 'LIMIT_PER_LINE' };
  }
  const d = getDb();
  const existing = d
    .prepare('SELECT qty FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(user, productId) as { qty: number } | undefined;
  if (!existing) return { ok: false, code: 'NOT_FOUND' };
  const product = d.prepare('SELECT name, stock FROM products WHERE id = ?').get(productId) as {
    name: string; stock: number;
  } | undefined;
  if (!product) return { ok: false, code: 'NOT_FOUND' };
  if (qty > product.stock) {
    return {
      ok: false,
      code: 'STOCK_CONFLICT',
      conflicts: [{ productId, name: product.name, requested: qty, available: product.stock }],
    };
  }
  d.prepare('UPDATE cart_items SET qty = ? WHERE user_id = ? AND product_id = ?').run(qty, user, productId);
  return { ok: true, cart: cartView(user) };
}

export function removeFromCart(user: number, productId: number): CartResult {
  const info = getDb()
    .prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?')
    .run(user, productId);
  if (info.changes === 0) return { ok: false, code: 'NOT_FOUND' };
  return { ok: true, cart: cartView(user) };
}

export function clearCart(user: number): CartView {
  getDb().prepare('DELETE FROM cart_items WHERE user_id = ?').run(user);
  return { items: [], totalQty: 0, subtotalCents: 0 };
}
