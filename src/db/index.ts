import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

let db: Database.Database | null = null;

function loadSchemaSql(): string {
  // The schema is a plain .sql file so that scripts/seed-demo.mjs can reuse it
  // without a TypeScript runtime. Servers and tests always run from the project
  // root, so process.cwd() is safe here (see Appendix B.14).
  return fs.readFileSync(path.join(process.cwd(), 'src/db/schema.sql'), 'utf8');
}

export function getDb(): Database.Database {
  if (db) return db;
  const file = process.env.DATABASE_PATH ?? '.data/app.db';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  return db;
}

export function migrate(d: Database.Database): void {
  d.exec(loadSchemaSql());
}

/** Test-only: close the singleton so the next getDb() opens a fresh file. */
export function closeDb(): void {
  db?.close();
  db = null;
}
