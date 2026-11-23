import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  setCartQty,
} from '@/lib/cart';
import { closeTestDb, openTestDb, testDb } from './helpers/test-db';

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

beforeEach(() => { openTestDb(); });
afterAll(() => { closeTestDb(); });

describe('cart domain', () => {
  test('U-CART-01 add creates a line; getCart totals correct', () => {
    const user = insertUser('u@x.com', 'user1');
    const product = insertProduct('Mug', 1850, 24);
    addToCart(user, { productId: product, qty: 2 });
    const cart = getCart(user);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({
      productId: product, name: 'Mug', qty: 2, unitPriceCents: 1850, lineTotalCents: 3700,
    });
    expect(cart.totalQty).toBe(2);
    expect(cart.subtotalCents).toBe(3700);
  });

  test('U-CART-02 second add increments (2+3=5)', () => {
    const user = insertUser('u@x.com', 'user1');
    const product = insertProduct('Mug', 100, 24);
    addToCart(user, { productId: product, qty: 2 });
    addToCart(user, { productId: product, qty: 3 });
    expect(getCart(user).items[0].qty).toBe(5);
  });

  test('U-CART-03 target qty > 10 → LIMIT_PER_LINE', () => {
    const user = insertUser('u@x.com', 'user1');
    const product = insertProduct('Mug', 100, 24);
    const result = addToCart(user, { productId: product, qty: 8 });
    addToCart(user, { productId: product, qty: 3 });
    const again = addToCart(user, { productId: product, qty: 3 });
    expect(again).toMatchObject({ ok: false, code: 'LIMIT_PER_LINE' });
    expect(result.ok).toBe(true);
    expect(getCart(user).items[0].qty).toBe(8);
  });

  test('U-CART-04 target qty > stock → STOCK_CONFLICT with conflicts[0].requested/available and no row changed', () => {
    const user = insertUser('u@x.com', 'user1');
    const product = insertProduct('Cup', 100, 3);
    const result = addToCart(user, { productId: product, qty: 5 });
    expect(result).toMatchObject({ ok: false, code: 'STOCK_CONFLICT' });
    if (!result.ok) {
      expect(result.conflicts?.[0]).toMatchObject({ productId: product, requested: 5, available: 3 });
    }
    expect(getCart(user).items).toHaveLength(0);
  });

  test('U-CART-05 setCartQty updates, removeFromCart deletes, unknown line → NOT_FOUND', () => {
    const user = insertUser('u@x.com', 'user1');
    const product = insertProduct('Mug', 100, 24);
    addToCart(user, { productId: product, qty: 1 });
    setCartQty(user, product, 4);
    expect(getCart(user).items[0].qty).toBe(4);
    const missing = setCartQty(user, 999, 2);
    expect(missing).toEqual({ ok: false, code: 'NOT_FOUND' });
    removeFromCart(user, product);
    expect(getCart(user).items).toHaveLength(0);
    const removeMissing = removeFromCart(user, product);
    expect(removeMissing).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  test('U-CART-06 two users\' carts are independent', () => {
    const a = insertUser('a@x.com', 'userA');
    const b = insertUser('b@x.com', 'userB');
    const product = insertProduct('Mug', 100, 24);
    addToCart(a, { productId: product, qty: 2 });
    expect(getCart(a).items).toHaveLength(1);
    expect(getCart(b).items).toHaveLength(0);
  });

  test('U-CART-07 clearCart empties and getCart returns the zeroed view', () => {
    const user = insertUser('u@x.com', 'user1');
    const product = insertProduct('Mug', 100, 24);
    addToCart(user, { productId: product, qty: 2 });
    const cleared = clearCart(user);
    expect(cleared).toEqual({ items: [], totalQty: 0, subtotalCents: 0 });
    expect(getCart(user)).toEqual({ items: [], totalQty: 0, subtotalCents: 0 });
  });

  test('U-CART-08 add of missing product → NOT_FOUND', () => {
    const user = insertUser('u@x.com', 'user1');
    const result = addToCart(user, { productId: 999, qty: 1 });
    expect(result).toEqual({ ok: false, code: 'NOT_FOUND' });
  });
});
