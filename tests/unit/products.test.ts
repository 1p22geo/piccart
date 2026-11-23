import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  patchProduct,
} from '@/lib/products';
import { PHOTO_URL_PATTERN } from '@/lib/photos';
import { closeTestDb, openTestDb, testDb } from './helpers/test-db';

type ProductRow = { id: number; name: string; price_cents: number; stock: number; photos: string; updated_at: string };

function insertUser(email: string, username: string): number {
  const info = testDb()
    .prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)')
    .run(email, username, 'hash');
  return Number(info.lastInsertRowid);
}

function rawProduct(id: number): ProductRow {
  return testDb().prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow;
}

const baseInput = { name: 'Mug', description: 'A mug.', priceCents: 1850, stock: 24 };

beforeEach(() => { openTestDb(); });
afterAll(() => { closeTestDb(); });

describe('products domain', () => {
  test('U-PROD-01 createProduct returns a Product with 3 pattern-matching photos, stored JSON parses back', () => {
    const product = createProduct(baseInput);
    expect(product.photos).toHaveLength(3);
    for (const url of product.photos) expect(url).toMatch(PHOTO_URL_PATTERN);
    const stored = rawProduct(product.id).photos;
    expect(JSON.parse(stored)).toEqual(product.photos);
  });

  test('U-PROD-02 default listing is newest first (inserted order reversed)', () => {
    createProduct({ ...baseInput, name: 'First' });
    createProduct({ ...baseInput, name: 'Second' });
    createProduct({ ...baseInput, name: 'Third' });
    const { products } = listProducts({ query: '', sort: 'newest', page: 1 });
    expect(products.map((p) => p.name)).toEqual(['Third', 'Second', 'First']);
  });

  test('U-PROD-03 query is a case-insensitive substring match; %/_ are literal', () => {
    createProduct({ ...baseInput, name: 'Café Latte Mug 50%_off' });
    createProduct({ ...baseInput, name: 'Plain Cup' });
    const hit = listProducts({ query: 'café latte', sort: 'newest', page: 1 });
    expect(hit.products).toHaveLength(1);
    expect(hit.products[0].name).toBe('Café Latte Mug 50%_off');
    // Literal wildcards must not match everything.
    const pct = listProducts({ query: '%', sort: 'newest', page: 1 });
    expect(pct.products).toHaveLength(1);
    const underscore = listProducts({ query: '_', sort: 'newest', page: 1 });
    expect(underscore.products).toHaveLength(1);
  });

  test('U-PROD-04 name-asc alphabetical (NOCASE); price-asc cheapest first with id tiebreak', () => {
    createProduct({ ...baseInput, name: 'banana', priceCents: 300 });
    createProduct({ ...baseInput, name: 'Apple', priceCents: 300 });
    createProduct({ ...baseInput, name: 'cherry', priceCents: 100 });
    const nameAsc = listProducts({ query: '', sort: 'name-asc', page: 1 }).products.map((p) => p.name);
    expect(nameAsc).toEqual(['Apple', 'banana', 'cherry']);
    const priceAsc = listProducts({ query: '', sort: 'price-asc', page: 1 }).products.map((p) => p.name);
    expect(priceAsc).toEqual(['cherry', 'banana', 'Apple']);
  });

  test('U-PROD-05 unknown sort → newest; page 0/-1/"x" → page 1', () => {
    createProduct({ ...baseInput, name: 'Old', priceCents: 100 });
    createProduct({ ...baseInput, name: 'New', priceCents: 900 });
    const unknownSort = listProducts({ query: '', sort: 'bogus', page: 1 }).products.map((p) => p.name);
    expect(unknownSort).toEqual(['New', 'Old']);
    for (const page of ['0', '-1', 'x', '']) {
      const result = listProducts({ query: '', sort: 'newest', page });
      expect(result.page).toBe(1);
    }
  });

  test('U-PROD-06 13 products → total 13, totalPages 2, page 2 returns the 1 remainder', () => {
    for (let i = 0; i < 13; i++) {
      createProduct({ ...baseInput, name: `P${String(i).padStart(2, '0')}` });
    }
    const p1 = listProducts({ query: '', sort: 'newest', page: 1 });
    expect(p1.total).toBe(13);
    expect(p1.totalPages).toBe(2);
    expect(p1.products).toHaveLength(12);
    const p2 = listProducts({ query: '', sort: 'newest', page: 2 });
    expect(p2.products).toHaveLength(1);
    // A page beyond totalPages clamps back into range.
    const p99 = listProducts({ query: '', sort: 'newest', page: 99 });
    expect(p99.page).toBe(2);
  });

  test('U-PROD-07 getProduct → null for missing id, NaN, 0, -3', () => {
    createProduct(baseInput);
    expect(getProduct(1)).not.toBeNull();
    expect(getProduct(99)).toBeNull();
    expect(getProduct(NaN)).toBeNull();
    expect(getProduct(0)).toBeNull();
    expect(getProduct(-3)).toBeNull();
  });

  test('U-PROD-08 patch stock only: name/description/price/photos unchanged, updatedAt >= createdAt', () => {
    const created = createProduct(baseInput);
    const before = rawProduct(created.id);
    const result = patchProduct(created.id, { ...baseInput, stock: 7 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.product.stock).toBe(7);
    const after = rawProduct(created.id);
    expect(after.name).toBe(before.name);
    expect(after.price_cents).toBe(before.price_cents);
    expect(after.photos).toBe(before.photos);
    expect(after.updated_at >= before.updated_at).toBe(true);
  });

  test('U-PROD-09 patch of missing id → typed NOT_FOUND result', () => {
    const result = patchProduct(42, baseInput);
    expect(result).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  test('U-PROD-10 deleteProduct true → cart line cascade-gone; an existing order keeps name/price snapshots', () => {
    const created = createProduct(baseInput);
    const userId = insertUser('u@x.com', 'user1');
    testDb().prepare('INSERT INTO cart_items (user_id, product_id, qty) VALUES (?, ?, ?)').run(userId, created.id, 2);
    testDb().prepare(`
      INSERT INTO orders (user_id, full_name, address_line1, city, postal_code, country, total_cents)
      VALUES (?, 'A B', '1 Way', 'City', '12345', 'Polska', 3700)`).run(userId);
    testDb().prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, qty, line_total_cents)
      VALUES (1, ?, ?, 1850, 2, 3700)`).run(created.id, created.name);

    expect(deleteProduct(created.id)).toBe(true);
    expect(deleteProduct(created.id)).toBe(false);

    const cartCount = (testDb().prepare('SELECT COUNT(*) AS n FROM cart_items').get() as { n: number }).n;
    expect(cartCount).toBe(0);
    const item = testDb().prepare('SELECT * FROM order_items WHERE id = 1').get() as {
      product_name: string; unit_price_cents: number;
    };
    expect(item.product_name).toBe(created.name);
    expect(item.unit_price_cents).toBe(1850);
  });
});
