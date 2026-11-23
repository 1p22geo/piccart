import { GET as listOrdersHandler, POST as placeOrderHandler } from '@/app/api/orders/route';
import { POST as addToCartItemHandler } from '@/app/api/cart/items/route';
import {
  PATCH as setQtyHandler,
  DELETE as removeLineHandler,
} from '@/app/api/cart/items/[productId]/route';
import { GET as getCartHandler, DELETE as clearCartHandler } from '@/app/api/cart/route';
import { GET as getOrderHandler } from '@/app/api/orders/[id]/route';
import { testDb, closeTestDb, openTestDb } from './helpers/test-db';

function jsonRequest(path: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost:3000${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

function cookie(token: string): RequestInit['headers'] {
  return { cookie: `piccart_sid=${token}` };
}

function insertUser(email: string, username: string, token: string): void {
  testDb()
    .prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)')
    .run(email, username, 'hash');
  testDb()
    .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, 1, ?)')
    .run(token, new Date(Date.now() + 30 * 86_400_000).toISOString());
}

function insertProduct(name: string, priceCents: number, stock: number): number {
  const info = testDb()
    .prepare('INSERT INTO products (name, price_cents, stock, photos) VALUES (?, ?, ?, ?)')
    .run(name, priceCents, stock, JSON.stringify(['a', 'b', 'c']));
  return Number(info.lastInsertRowid);
}

beforeEach(() => { openTestDb(); });
afterAll(() => { closeTestDb(); });

describe('api routes (cart + orders)', () => {
  test('U-API-08 POST /api/orders with a conflicting cart → 409 STOCK_CONFLICT + conflicts', async () => {
    const token = 'tok-' + Math.random().toString(16).slice(2);
    insertUser('u@x.com', 'user1', token);
    const cup = insertProduct('Emaliowany kubek turystyczny', 1240, 5);
    // Add 3 to the cart while stock allows, then drop stock to 1.
    const added = await addToCartItemHandler(
      jsonRequest('/api/cart/items', { method: 'POST', headers: cookie(token), body: JSON.stringify({ productId: cup, qty: 3 }) }),
    );
    expect(added.status).toBe(201);
    testDb().prepare('UPDATE products SET stock = 1 WHERE id = ?').run(cup);

    const response = await placeOrderHandler(jsonRequest('/api/orders', {
      method: 'POST',
      headers: cookie(token),
      body: JSON.stringify({
        fullName: 'Robin Tan',
        addressLine1: '12 Market Street',
        addressLine2: '',
        city: 'Warszawa',
        postalCode: '00-001',
        country: 'Polska',
      }),
    }));
    expect(response.status).toBe(409);
    const body = (await response.json()) as {
      error: { code: string; conflicts: { productId: number; requested: number; available: number }[] };
    };
    expect(body.error.code).toBe('STOCK_CONFLICT');
    expect(body.error.conflicts).toHaveLength(1);
    expect(body.error.conflicts[0]).toMatchObject({ productId: cup, requested: 3, available: 1 });
  });

  test('U-API-08b cart handlers: GET/POST/PATCH/DELETE round-trip with the session cookie', async () => {
    const token = 'tok-' + Math.random().toString(16).slice(2);
    insertUser('u@x.com', 'user1', token);
    const mug = insertProduct('Mug', 1850, 24);

    // 401 without a cookie.
    const anon = await getCartHandler(jsonRequest('/api/cart'));
    expect(anon.status).toBe(401);

    // GET empty cart.
    const empty = await getCartHandler(jsonRequest('/api/cart', { headers: cookie(token) }));
    expect(empty.status).toBe(200);
    await expect(empty.json()).resolves.toEqual({ cart: { items: [], totalQty: 0, subtotalCents: 0 } });

    // POST a line.
    const added = await addToCartItemHandler(jsonRequest('/api/cart/items', {
      method: 'POST', headers: cookie(token), body: JSON.stringify({ productId: mug, qty: 2 }),
    }));
    expect(added.status).toBe(201);
    const addedBody = (await added.json()) as { cart: { items: { qty: number }[] } };
    expect(addedBody.cart.items[0].qty).toBe(2);

    // PATCH the line qty.
    const patched = await setQtyHandler(jsonRequest(`/api/cart/items/${mug}`, {
      method: 'PATCH', headers: cookie(token), body: JSON.stringify({ qty: 5 }),
    }), { params: Promise.resolve({ productId: String(mug) }) });
    expect(patched.status).toBe(200);

    // DELETE the line, then DELETE again → 404.
    const removed = await removeLineHandler(jsonRequest(`/api/cart/items/${mug}`, {
      method: 'DELETE', headers: cookie(token),
    }), { params: Promise.resolve({ productId: String(mug) }) });
    expect(removed.status).toBe(200);
    const removedBody = (await removed.json()) as { cart: { items: unknown[] } };
    expect(removedBody.cart.items).toHaveLength(0);
    const gone = await removeLineHandler(jsonRequest(`/api/cart/items/${mug}`, {
      method: 'DELETE', headers: cookie(token),
    }), { params: Promise.resolve({ productId: String(mug) }) });
    expect(gone.status).toBe(404);

    // DELETE /api/cart is a no-op 200.
    const cleared = await clearCartHandler(jsonRequest('/api/cart', { method: 'DELETE', headers: cookie(token) }));
    expect(cleared.status).toBe(200);
  });

  test('U-API-08c orders handlers: GET list + detail, owner-only 404 for others', async () => {
    const tokenA = 'tok-a-' + Math.random().toString(16).slice(2);
    insertUser('a@x.com', 'userA', tokenA);
    const mug = insertProduct('Mug', 1850, 24);
    const shipping = {
      fullName: 'Robin Tan', addressLine1: '12 Market Street', addressLine2: '',
      city: 'Warszawa', postalCode: '00-001', country: 'Polska',
    };
    await addToCartItemHandler(jsonRequest('/api/cart/items', {
      method: 'POST', headers: cookie(tokenA), body: JSON.stringify({ productId: mug, qty: 2 }),
    }));
    const placed = await placeOrderHandler(jsonRequest('/api/orders', {
      method: 'POST', headers: cookie(tokenA), body: JSON.stringify(shipping),
    }));
    expect(placed.status).toBe(201);
    const { order } = (await placed.json()) as { order: { id: number; totalCents: number } };
    expect(order.totalCents).toBe(3700);

    const list = await listOrdersHandler(jsonRequest('/api/orders', { headers: cookie(tokenA) }));
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { orders: { id: number }[] };
    expect(listBody.orders).toHaveLength(1);

    const detail = await getOrderHandler(jsonRequest(`/api/orders/${order.id}`, { headers: cookie(tokenA) }),
      { params: Promise.resolve({ id: String(order.id) }) });
    expect(detail.status).toBe(200);

    // A different user gets 404 (privacy).
    const tokenB = 'tok-b-' + Math.random().toString(16).slice(2);
    testDb().prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)').run('b@x.com', 'userB', 'hash');
    testDb().prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, 2, ?)')
      .run(tokenB, new Date(Date.now() + 30 * 86_400_000).toISOString());
    const foreign = await getOrderHandler(jsonRequest(`/api/orders/${order.id}`, { headers: cookie(tokenB) }),
      { params: Promise.resolve({ id: String(order.id) }) });
    expect(foreign.status).toBe(404);
  });
});
