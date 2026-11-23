import { getDb } from '@/db';
import { getCart } from './cart';
import type { Order, ShippingFields, StockConflict } from './types';

type OrderRow = {
  id: number;
  user_id: number;
  status: string;
  full_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  total_cents: number;
  placed_at: string;
};

type OrderItemRow = {
  product_id: number;
  product_name: string;
  unit_price_cents: number;
  qty: number;
  line_total_cents: number;
};

function rowToOrder(row: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: row.id,
    userId: row.user_id,
    status: 'PLACED',
    placedAt: row.placed_at,
    shipping: {
      fullName: row.full_name,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      city: row.city,
      postalCode: row.postal_code,
      country: row.country,
    },
    items: items.map((i) => ({
      productId: i.product_id,
      name: i.product_name,
      qty: i.qty,
      unitPriceCents: i.unit_price_cents,
      lineTotalCents: i.line_total_cents,
    })),
    totalCents: row.total_cents,
  };
}

function itemsForOrder(orderId: number): OrderItemRow[] {
  return getDb()
    .prepare(
      `SELECT product_id, product_name, unit_price_cents, qty, line_total_cents
       FROM order_items WHERE order_id = ? ORDER BY id ASC`,
    )
    .all(orderId) as OrderItemRow[];
}

export function listOrders(user: number): Order[] {
  const rows = getDb()
    .prepare(
      `SELECT id, user_id, status, full_name, address_line1, address_line2, city, postal_code,
              country, total_cents, placed_at
       FROM orders WHERE user_id = ? ORDER BY id DESC`,
    )
    .all(user) as OrderRow[];
  return rows.map((r) => rowToOrder(r, itemsForOrder(r.id)));
}

export function getOrder(user: number, id: number): Order | null {
  if (!Number.isInteger(id) || id < 1) return null;
  const row = getDb()
    .prepare(
      `SELECT id, user_id, status, full_name, address_line1, address_line2, city, postal_code,
              country, total_cents, placed_at
       FROM orders WHERE id = ? AND user_id = ?`,
    )
    .get(id, user) as OrderRow | undefined;
  if (!row) return null;
  return rowToOrder(row, itemsForOrder(id));
}

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | { ok: false; code: 'CART_EMPTY' | 'STOCK_CONFLICT'; conflicts?: StockConflict[] };

// The transactional heart (§7.16): validate stock first, then in ONE synchronous
// transaction decrement stock, write the order + snapshot items, and clear the cart.
// better-sqlite3 is synchronous, so no await runs inside the transaction; a thrown
// error rolls everything back.
export function placeOrder(user: number, shipping: ShippingFields): PlaceOrderResult {
  const cart = getCart(user);
  if (cart.items.length === 0) return { ok: false, code: 'CART_EMPTY' };

  // Every line where qty > stock is a conflict. List them all before writing anything.
  const conflicts: StockConflict[] = cart.items
    .filter((line) => line.qty > line.stock)
    .map((line) => ({
      productId: line.productId,
      name: line.name,
      requested: line.qty,
      available: line.stock,
    }));
  if (conflicts.length > 0) return { ok: false, code: 'STOCK_CONFLICT', conflicts };

  const d = getDb();
  const totalCents = cart.items.reduce((s, i) => s + i.lineTotalCents, 0);

  const orderId = d.transaction(() => {
    const decrement = d.prepare(
      'UPDATE products SET stock = stock - ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?',
    );
    const insertOrder = d.prepare(
      `INSERT INTO orders
        (user_id, full_name, address_line1, address_line2, city, postal_code, country, total_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertItem = d.prepare(
      `INSERT INTO order_items
        (order_id, product_id, product_name, unit_price_cents, qty, line_total_cents)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    const orderInfo = insertOrder.run(
      user,
      shipping.fullName,
      shipping.addressLine1,
      shipping.addressLine2,
      shipping.city,
      shipping.postalCode,
      shipping.country,
      totalCents,
    );
    const id = Number(orderInfo.lastInsertRowid);
    for (const line of cart.items) {
      const result = decrement.run(line.qty, line.productId);
      if (result.changes !== 1) throw new Error(`stock decrement failed for product ${line.productId}`);
      insertItem.run(id, line.productId, line.name, line.unitPriceCents, line.qty, line.lineTotalCents);
    }
    d.prepare('DELETE FROM cart_items WHERE user_id = ?').run(user);
    return id;
  })();

  const row = d
    .prepare(
      `SELECT id, user_id, status, full_name, address_line1, address_line2, city, postal_code,
              country, total_cents, placed_at FROM orders WHERE id = ?`,
    )
    .get(orderId) as OrderRow;
  return { ok: true, order: rowToOrder(row, itemsForOrder(orderId)) };
}
