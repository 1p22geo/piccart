import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

export default function globalSetup(): void {
  for (const f of ['.data/e2e.db', '.data/e2e.db-wal', '.data/e2e.db-shm']) {
    fs.rmSync(f, { force: true });
  }
  execFileSync('node', ['scripts/seed-demo.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_PATH: '.data/e2e.db' },
  });
}
