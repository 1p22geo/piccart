import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const database = resolve('.data/e2e.db');
if (!process.env.DATABASE_PATH || resolve(process.env.DATABASE_PATH) !== database) {
  throw new Error('Playwright must use .data/e2e.db');
}

for (const suffix of ['', '-wal', '-shm']) {
  rmSync(database + suffix, { force: true });
}
await import('./seed-demo.mjs');
