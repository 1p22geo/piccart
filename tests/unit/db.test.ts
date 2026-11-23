import { migrate } from '@/db';
import { closeTestDb, openTestDb, testDb } from './helpers/test-db';

type CountRow = { n: number };
type UserRow = { role: string; created_at: string };
type CartRow = { qty: number };
type SessionRow = { token: string; expires_at: string };

function count(d: ReturnType<typeof testDb>, table: string): number {
  return (d.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as CountRow).n;
}

function insertUser(d: ReturnType<typeof testDb>, email: string, username: string, role = 'user'): void {
  d.prepare('INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
    email, username, 'hash', role,
  );
}

function insertProduct(d: ReturnType<typeof testDb>, name: string, price = 100, stock = 5, photos = JSON.stringify(['a', 'b', 'c'])): void {
  d.prepare('INSERT INTO products (name, price_cents, stock, photos) VALUES (?, ?, ?, ?)').run(
    name, price, stock, photos,
  );
}

beforeEach(() => { openTestDb(); });
afterAll(() => { closeTestDb(); });

describe('db schema and connection layer', () => {
  test('U-DB-01 running the schema twice on one connection never throws', () => {
    const d = testDb();
    expect(() => { migrate(d); migrate(d); }).not.toThrow();
  });

  test('U-DB-02 inserted user gets role user and an ISO created_at', () => {
    const d = testDb();
    insertUser(d, 'a@b.co', 'abby');
    const row = d.prepare('SELECT * FROM users WHERE email = ?').get('a@b.co') as UserRow;
    expect(row.role).toBe('user');
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test('U-DB-03 inserting Foo@x.com after foo@X.COM violates uniqueness', () => {
    const d = testDb();
    insertUser(d, 'foo@x.com', 'u1');
    expect(() => insertUser(d, 'Foo@X.COM', 'u2')).toThrow();
  });

  test('U-DB-04 same for usernames (NOCASE)', () => {
    const d = testDb();
    insertUser(d, 'a@x.com', 'SameUser');
    expect(() => insertUser(d, 'b@x.com', 'sameuser')).toThrow();
  });

  test('U-DB-05 second role=admin row rejected by the partial unique index', () => {
    const d = testDb();
    insertUser(d, 'admin@x.com', 'admin', 'admin');
    expect(() => insertUser(d, 'other@x.com', 'otheradmin', 'admin')).toThrow();
  });

  test('U-DB-06 product CHECKs: price_cents 0 and stock -1 rejected', () => {
    const d = testDb();
    expect(() => insertProduct(d, 'P', 0, 5)).toThrow();
    expect(() => insertProduct(d, 'P', 100, -1)).toThrow();
  });

  test('U-DB-07 photos CHECK: non-JSON text and 2-element arrays rejected; 3-element accepted', () => {
    const d = testDb();
    expect(() => insertProduct(d, 'P', 100, 5, 'not json')).toThrow();
    expect(() => insertProduct(d, 'P', 100, 5, JSON.stringify(['a', 'b']))).toThrow();
    expect(() => insertProduct(d, 'P', 100, 5, JSON.stringify(['a', 'b', 'c']))).not.toThrow();
  });

  test('U-DB-08 cart PK upsert: second insert for the same (user, product) with ON CONFLICT DO UPDATE changes qty', () => {
    const d = testDb();
    insertUser(d, 'u@x.com', 'user1');
    insertProduct(d, 'P');
    const upsert = d.prepare(`
      INSERT INTO cart_items (user_id, product_id, qty) VALUES (?, ?, ?)
      ON CONFLICT (user_id, product_id) DO UPDATE SET qty = excluded.qty`);
    upsert.run(1, 1, 2);
    upsert.run(1, 1, 7);
    const row = d.prepare('SELECT qty FROM cart_items WHERE user_id = 1 AND product_id = 1').get() as CartRow;
    expect(row.qty).toBe(7);
    expect(count(d, 'cart_items')).toBe(1);
  });

  test('U-DB-09 cart qty CHECK: 0 and 11 rejected', () => {
    const d = testDb();
    insertUser(d, 'u@x.com', 'user1');
    insertProduct(d, 'P');
    const insert = (qty: number) =>
      d.prepare('INSERT INTO cart_items (user_id, product_id, qty) VALUES (1, 1, ?)').run(qty);
    expect(() => insert(0)).toThrow();
    expect(() => insert(11)).toThrow();
  });

  test('U-DB-10 deleting a product removes its cart_items (CASCADE)', () => {
    const d = testDb();
    insertUser(d, 'u@x.com', 'user1');
    insertProduct(d, 'P');
    d.prepare('INSERT INTO cart_items (user_id, product_id, qty) VALUES (1, 1, 2)').run();
    d.prepare('DELETE FROM products WHERE id = 1').run();
    expect(count(d, 'cart_items')).toBe(0);
  });

  test('U-DB-11 deleting a user removes sessions, cart items, orders and order items (CASCADE)', () => {
    const d = testDb();
    insertUser(d, 'u@x.com', 'user1');
    insertProduct(d, 'P');
    d.prepare('INSERT INTO cart_items (user_id, product_id, qty) VALUES (1, 1, 2)').run();
    d.prepare(`
      INSERT INTO orders (user_id, full_name, address_line1, city, postal_code, country, total_cents)
      VALUES (1, 'A B', '1 Way', 'City', '12345', 'United States', 200)`).run();
    d.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, qty, line_total_cents)
      VALUES (1, 1, 'P', 100, 2, 200)`).run();
    d.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES ('tok1', 1, '2099-01-01T00:00:00.000Z')`).run();
    d.prepare('DELETE FROM users WHERE id = 1').run();
    expect(count(d, 'sessions')).toBe(0);
    expect(count(d, 'cart_items')).toBe(0);
    expect(count(d, 'orders')).toBe(0);
    expect(count(d, 'order_items')).toBe(0);
  });

  test('U-DB-12 a session whose expires_at is in the past is selectable but must be treated expired (ISO string compare)', () => {
    const d = testDb();
    insertUser(d, 'u@x.com', 'user1');
    d.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES ('expired', 1, '2000-01-01T00:00:00.000Z')`).run();
    const row = d.prepare('SELECT token, expires_at FROM sessions WHERE token = ?').get('expired') as SessionRow;
    expect(row).toBeDefined();
    expect(row.expires_at <= new Date().toISOString()).toBe(true);
    d.prepare('DELETE FROM sessions WHERE token = ?').run('expired');
    expect(d.prepare('SELECT token FROM sessions WHERE token = ?').get('expired')).toBeUndefined();
  });
});
