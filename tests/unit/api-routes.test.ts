import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';
import { registerUser } from '@/lib/auth';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { GET as meHandler } from '@/app/api/auth/me/route';
import { GET as listProductsHandler, POST as createProductHandler } from '@/app/api/products/route';
import {
  GET as getProductHandler,
  PATCH as patchProductHandler,
  DELETE as deleteProductHandler,
} from '@/app/api/products/[id]/route';
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

function createAdminUser(): string {
  const d = testDb();
  const hash = bcrypt.hashSync('Admin-Seed-1', 10);
  const info = d
    .prepare('INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)')
    .run('admin@test.local', 'admin', hash, 'admin');
  return createSession(Number(info.lastInsertRowid)).token;
}

async function createShopperUser(): Promise<{ token: string; username: string }> {
  const result = await registerUser({
    email: `shopper-${Date.now()}@test.local`,
    username: `shopper-${Math.floor(Math.random() * 1e6)}`,
    password: 'Sun5et-Lane',
  });
  if (!result.ok) throw new Error('register failed in test setup');
  return { token: result.token, username: result.user.username };
}

beforeEach(() => { openTestDb(); });
afterAll(() => { closeTestDb(); });

describe('api routes (auth + products)', () => {
  test('U-API-01 register handler → 201, Set-Cookie contains piccart_sid=, body {user} without passwordHash', async () => {
    const response = await registerHandler(jsonRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.co', username: 'abby', password: 'Passw0rd-x' }),
    }));
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toContain('piccart_sid=');
    const body = (await response.json()) as { user: Record<string, unknown> };
    expect(body.user.email).toBe('a@b.co');
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(body.user).not.toHaveProperty('password');
  });

  test('U-API-02 duplicate email → 409 envelope EMAIL_TAKEN with a fields array', async () => {
    await registerHandler(jsonRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'dupe@b.co', username: 'dupe', password: 'Passw0rd-x' }),
    }));
    const response = await registerHandler(jsonRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'dupe@b.co', username: 'other', password: 'Passw0rd-x' }),
    }));
    expect(response.status).toBe(409);
    const body = (await response.json()) as {
      error: { code: string; message: string; fields: { field: string }[] };
    };
    expect(body.error.code).toBe('EMAIL_TAKEN');
    expect(Array.isArray(body.error.fields)).toBe(true);
    expect(body.error.fields[0].field).toBe('email');
  });

  test('U-API-03 bad login → 401 INVALID_CREDENTIALS', async () => {
    const response = await loginHandler(jsonRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'nobody@b.co', password: 'Wrong-Password-1' }),
    }));
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('U-API-04 /api/auth/me with no cookie → 200 {user: null}', async () => {
    const response = await meHandler(jsonRequest('/api/auth/me'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: null });
  });

  test('U-API-05 POST /api/products without cookie → 401 UNAUTHENTICATED', async () => {
    const response = await createProductHandler(jsonRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', price: '1.00', stock: 1 }),
    }));
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  test('U-API-06 POST /api/products with a shopper cookie → 403 FORBIDDEN', async () => {
    const { token } = await createShopperUser();
    const response = await createProductHandler(jsonRequest('/api/products', {
      method: 'POST',
      headers: cookie(token),
      body: JSON.stringify({ name: 'X', price: '1.00', stock: 1 }),
    }));
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('FORBIDDEN');
  });

  test('U-API-07 admin PATCH /api/products/:id {stock} → 200 and the product is updated', async () => {
    // Seed a product as admin, then patch its stock.
    const adminToken = createAdminUser();
    const created = await createProductHandler(jsonRequest('/api/products', {
      method: 'POST',
      headers: cookie(adminToken),
      body: JSON.stringify({ name: 'Mug', description: '', price: '18.50', stock: 24 }),
    }));
    expect(created.status).toBe(201);
    const { product } = (await created.json()) as { product: { id: number } };

    const patched = await patchProductHandler(jsonRequest(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: cookie(adminToken),
      body: JSON.stringify({ stock: 7 }),
    }), { params: Promise.resolve({ id: String(product.id) }) });
    expect(patched.status).toBe(200);
    const body = (await patched.json()) as { product: { stock: number } };
    expect(body.product.stock).toBe(7);

    // GET reflects the change.
    const fetched = await getProductHandler(jsonRequest(`/api/products/${product.id}`),
      { params: Promise.resolve({ id: String(product.id) }) });
    expect(fetched.status).toBe(200);
    const fetchedBody = (await fetched.json()) as { product: { stock: number } };
    expect(fetchedBody.product.stock).toBe(7);

    // DELETE removes it, second DELETE 404s.
    const deleted = await deleteProductHandler(jsonRequest(`/api/products/${product.id}`, {
      method: 'DELETE',
      headers: cookie(adminToken),
    }), { params: Promise.resolve({ id: String(product.id) }) });
    expect(deleted.status).toBe(204);
    const gone = await getProductHandler(jsonRequest(`/api/products/${product.id}`),
      { params: Promise.resolve({ id: String(product.id) }) });
    expect(gone.status).toBe(404);
  });

  test('U-API-07b GET /api/products lists with pagination envelope', async () => {
    const adminToken = createAdminUser();
    await createProductHandler(jsonRequest('/api/products', {
      method: 'POST',
      headers: cookie(adminToken),
      body: JSON.stringify({ name: 'Mug', description: '', price: '18.50', stock: 24 }),
    }));
    const response = await listProductsHandler(new Request('http://localhost:3000/api/products?query=mug&sort=newest&page=1'));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      products: unknown[]; page: number; pageSize: number; total: number; totalPages: number;
    };
    expect(body.products).toHaveLength(1);
    expect(body.page).toBe(1);
    expect(body.total).toBe(1);
    expect(body.totalPages).toBe(1);
  });

  test('U-API-07c logout is idempotent 204 and clears the cookie', async () => {
    const { token } = await createShopperUser();
    const first = await logoutHandler(jsonRequest('/api/auth/logout', { method: 'POST', headers: cookie(token) }));
    expect(first.status).toBe(204);
    expect(first.headers.get('set-cookie')).toContain('piccart_sid=;');
    const second = await logoutHandler(jsonRequest('/api/auth/logout', { method: 'POST' }));
    expect(second.status).toBe(204);
  });
});
