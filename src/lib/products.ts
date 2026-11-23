import { getDb } from '@/db';
import { escapeLike } from './format';
import { generateProductPhotos } from './photos';
import { PAGE_SIZE, SORT_OPTIONS, type SortOption } from './constants';
import { validateProductInput } from './validation';
import type { Product, ProductInput } from './types';

type ProductRow = {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  stock: number;
  photos: string;
  created_at: string;
  updated_at: string;
};

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    stock: row.stock,
    photos: JSON.parse(row.photos) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ListParams = { query: string; sort: string; page: string | number };
export type ListResult = {
  products: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function clampPage(value: string | number): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isInteger(n) || n < 1) return 1;
  return n;
}

function resolveSort(value: string): SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(value) ? (value as SortOption) : 'newest';
}

const ORDER_BY: Record<SortOption, string> = {
  newest: 'id DESC',
  'name-asc': 'name COLLATE NOCASE ASC',
  'name-desc': 'name COLLATE NOCASE DESC',
  'price-asc': 'price_cents ASC, id ASC',
  'price-desc': 'price_cents DESC, id DESC',
};

export function listProducts(params: ListParams): ListResult {
  const d = getDb();
  const sort = resolveSort(params.sort);
  const query = (typeof params.query === 'string' ? params.query : '').trim();

  const like = query === '' ? null : `%${escapeLike(query)}%`;
  const where = like === null ? '' : " WHERE name LIKE ? ESCAPE '\\'";

  const total = (
    d.prepare(`SELECT COUNT(*) AS n FROM products${where}`).get(...(like === null ? [] : [like])) as { n: number }
  ).n;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(clampPage(params.page), totalPages);
  const offset = (page - 1) * PAGE_SIZE;

  const rows = d
    .prepare(
      `SELECT * FROM products${where} ORDER BY ${ORDER_BY[sort]} LIMIT ? OFFSET ?`,
    )
    .all(...(like === null ? [] : [like]), PAGE_SIZE, offset) as ProductRow[];

  return { products: rows.map(rowToProduct), page, pageSize: PAGE_SIZE, total, totalPages };
}

export function getProduct(id: number): Product | null {
  if (!Number.isInteger(id) || id < 1) return null;
  const row = getDb().prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
  return row ? rowToProduct(row) : null;
}

export function createProduct(input: ProductInput): Product {
  const d = getDb();
  const photos = JSON.stringify(generateProductPhotos());
  const info = d
    .prepare(
      'INSERT INTO products (name, description, price_cents, stock, photos) VALUES (?, ?, ?, ?, ?)',
    )
    .run(input.name, input.description, input.priceCents, input.stock, photos);
  const row = d.prepare('SELECT * FROM products WHERE id = ?').get(Number(info.lastInsertRowid)) as ProductRow;
  return rowToProduct(row);
}

export type PatchResult =
  | { ok: true; product: Product }
  | { ok: false; code: 'NOT_FOUND' | 'VALIDATION_ERROR'; errors?: { field: string; message: string }[] };

export function patchProduct(id: number, input: unknown): PatchResult {
  if (!Number.isInteger(id) || id < 1) return { ok: false, code: 'NOT_FOUND' };
  const d = getDb();
  const row = d.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
  if (!row) return { ok: false, code: 'NOT_FOUND' };
  const current = {
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    stock: row.stock,
  };
  const validation = validateProductInput(input, 'patch', current);
  if (!validation.ok) return { ok: false, code: 'VALIDATION_ERROR', errors: validation.errors };
  const { name, description, priceCents, stock } = validation.value;
  d.prepare(
    'UPDATE products SET name = ?, description = ?, price_cents = ?, stock = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?',
  ).run(name, description, priceCents, stock, id);
  const updated = d.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow;
  return { ok: true, product: rowToProduct(updated) };
}

export function deleteProduct(id: number): boolean {
  if (!Number.isInteger(id) || id < 1) return false;
  const info = getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
  return info.changes === 1;
}
