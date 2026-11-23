import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, getDb } from '@/db';

export function openTestDb(): ReturnType<typeof getDb> {
  closeDb();
  process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'piccart-test-')), 'test.db');
  return getDb(); // applies the schema
}

export const testDb = (): ReturnType<typeof getDb> => getDb();
export function closeTestDb(): void { closeDb(); }
