import { addToCart, getCart } from '@/lib/cart';
import { getOrder, listOrders, placeOrder } from '@/lib/orders';
import { testDb, closeTestDb, openTestDb } from './helpers/test-db';
import type { ShippingFields } from '@/lib/types';

type CountRow = { n: number };
type ProductRow = { stock: number };

function count(table: string): number {
  return (testDb().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as CountRow).n;
}

function insertUser(email: string, username: string): number {
  const info = testDb()
    .prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)')
    .run(email, username, 'hash');
  return Number(info.lastInsertRowid);
}

function insertProduct(name: string, priceCents: number, stock: number): number {
  const info = testDb()
    .prepare('INSERT INTO products (name, price_cents, stock, photos) VALUES (?, ?, ?, ?)')
    .run(name, priceCents, stock, JSON.stringify(['a', 'b', 'c']));
  return Number(info.lastInsertRowid);
}

function stockOf(id: number): number {
  return (testDb().prepare('SELECT stock FROM products WHERE id = ?').get(id) as ProductRow).stock;
}

const SHIPPING: ShippingFields = {
  fullName: 'Robin Tan',
  addressLine1: '12 Market Street',
  addressLine2: '',
  city: 'Warszawa',
  postalCode: '00-001',
  country: 'Polska',
};

beforeEach(() => { openTestDb(); });
afterAll(() => { closeTestDb(); });

describe('orders domain', () => {
  test('U-ORDER-01 happy path: snapshots, stock decremented, cart empty, totalCents = Σ lineTotalCents', () => {
    const user = insertUser('u@x.com', 'user1');
    const mug = insertProduct('Mug', 1850, 24);
    const beanie = insertProduct('Beanie', 1675, 8);
    addToCart(user, { productId: mug, qty: 2 });
    addToCart(user, { productId: beanie, qty: 1 });

    const result = placeOrder(user, SHIPPING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.items).toHaveLength(2);
    expect(stockOf(mug)).toBe(22);
    expect(stockOf(beanie)).toBe(7);
    expect(getCart(user).items).toHaveLength(0);
    expect(result.order.totalCents).toBe(result.order.items.reduce((s, i) => s + i.lineTotalCents, 0));
    expect(result.order.status).toBe('PLACED');
  });

  test('U-ORDER-02 shipping fields persisted verbatim (incl. empty addressLine2)', () => {
    const user = insertUser('u@x.com', 'user1');
    const mug = insertProduct('Mug', 1850, 24);
    addToCart(user, { productId: mug, qty: 1 });
    const result = placeOrder(user, { ...SHIPPING, addressLine2: '' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const row = testDb().prepare('SELECT * FROM orders WHERE id = ?').get(result.order.id) as {
      full_name: string; address_line1: string; address_line2: string; city: string; postal_code: string; country: string;
    };
    expect(row).toMatchObject({
      full_name: 'Robin Tan',
      address_line1: '12 Market Street',
      address_line2: '',
      city: 'Warszawa',
      postal_code: '00-001',
      country: 'Polska',
    });
  });

  test('U-ORDER-03 empty cart → CART_EMPTY; zero rows written anywhere', () => {
    const user = insertUser('u@x.com', 'user1');
    const before = { orders: count('orders'), items: count('order_items') };
    const result = placeOrder(user, SHIPPING);
    expect(result).toEqual({ ok: false, code: 'CART_EMPTY' });
    expect(count('orders')).toBe(before.orders);
    expect(count('order_items')).toBe(before.items);
  });

  test('U-ORDER-04 conflict on one of three lines → STOCK_CONFLICT lists all over-stock lines; nothing written', () => {
    const user = insertUser('u@x.com', 'user1');
    const a = insertProduct('A', 100, 5);
    const b = insertProduct('B', 100, 5);
    const c = insertProduct('C', 100, 5);
    addToCart(user, { productId: a, qty: 1 });
    addToCart(user, { productId: b, qty: 2 });
    addToCart(user, { productId: c, qty: 2 });
    // Stock drops after the lines are added — the conflict is detected at order time.
    testDb().prepare('UPDATE products SET stock = 1 WHERE id = ?').run(b);
    testDb().prepare('UPDATE products SET stock = 1 WHERE id = ?').run(c);

    const result = placeOrder(user, SHIPPING);
    expect(result).toMatchObject({ ok: false, code: 'STOCK_CONFLICT' });
    if (!result.ok) {
      expect(result.conflicts).toHaveLength(2);
      const ids = result.conflicts?.map((x) => x.productId).sort();
      expect(ids).toEqual([b, c]);
    }
    expect(stockOf(a)).toBe(5);
    expect(stockOf(b)).toBe(1);
    expect(stockOf(c)).toBe(1);
    expect(count('orders')).toBe(0);
    expect(count('order_items')).toBe(0);
    expect(getCart(user).items).toHaveLength(3);
  });

  test('U-ORDER-05 price snapshot: order items keep the old unit_price_cents after a reprice', () => {
    const user = insertUser('u@x.com', 'user1');
    const mug = insertProduct('Mug', 1850, 24);
    addToCart(user, { productId: mug, qty: 1 });
    const result = placeOrder(user, SHIPPING);
    expect(result.ok).toBe(true);
    testDb().prepare('UPDATE products SET price_cents = 9999 WHERE id = ?').run(mug);
    const item = testDb().prepare('SELECT * FROM order_items LIMIT 1').get() as { unit_price_cents: number };
    expect(item.unit_price_cents).toBe(1850);
  });

  test('U-ORDER-06 listOrders returns own orders newest-first only', () => {
    const a = insertUser('a@x.com', 'userA');
    const b = insertUser('b@x.com', 'userB');
    const mug = insertProduct('Mug', 1850, 24);
    addToCart(a, { productId: mug, qty: 1 });
    expect(placeOrder(a, SHIPPING).ok).toBe(true);
    addToCart(a, { productId: mug, qty: 1 });
    expect(placeOrder(a, SHIPPING).ok).toBe(true);
    addToCart(b, { productId: mug, qty: 1 });
    expect(placeOrder(b, SHIPPING).ok).toBe(true);

    const aOrders = listOrders(a);
    expect(aOrders).toHaveLength(2);
    expect(aOrders[0].id).toBeGreaterThan(aOrders[1].id);
    expect(listOrders(b)).toHaveLength(1);
  });

  test('U-ORDER-07 getOrder(owner, id) returns full detail incl. items', () => {
    const user = insertUser('u@x.com', 'user1');
    const mug = insertProduct('Mug', 1850, 24);
    addToCart(user, { productId: mug, qty: 2 });
    const placed = placeOrder(user, SHIPPING);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const order = getOrder(user, placed.order.id);
    expect(order).not.toBeNull();
    expect(order?.items).toHaveLength(1);
    expect(order?.items[0]).toMatchObject({ productId: mug, name: 'Mug', qty: 2, unitPriceCents: 1850 });
    expect(order?.totalCents).toBe(3700);
  });

  test('U-ORDER-08 getOrder(otherUser, id) → null', () => {
    const a = insertUser('a@x.com', 'userA');
    const b = insertUser('b@x.com', 'userB');
    const mug = insertProduct('Mug', 1850, 24);
    addToCart(a, { productId: mug, qty: 1 });
    const placed = placeOrder(a, SHIPPING);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(getOrder(b, placed.order.id)).toBeNull();
  });

  test('U-ORDER-09 two-line order decrements both products', () => {
    const user = insertUser('u@x.com', 'user1');
    const a = insertProduct('A', 100, 10);
    const b = insertProduct('B', 200, 10);
    addToCart(user, { productId: a, qty: 3 });
    addToCart(user, { productId: b, qty: 4 });
    const result = placeOrder(user, SHIPPING);
    expect(result.ok).toBe(true);
    expect(stockOf(a)).toBe(7);
    expect(stockOf(b)).toBe(6);
  });

  test('U-ORDER-10 line_total_cents = qty × unit_price_cents for every item', () => {
    const user = insertUser('u@x.com', 'user1');
    const mug = insertProduct('Mug', 1850, 24);
    const beanie = insertProduct('Beanie', 1675, 8);
    addToCart(user, { productId: mug, qty: 2 });
    addToCart(user, { productId: beanie, qty: 3 });
    const result = placeOrder(user, SHIPPING);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const item of result.order.items) {
      expect(item.lineTotalCents).toBe(item.qty * item.unitPriceCents);
    }
    expect(count('order_items')).toBe(2);
  });
});
