import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { E2E_ADMIN_PASSWORD } from './helpers';

export default async function setup() {
  const url = 'http://localhost:3100';
  const env = { ...process.env, PORT: '3100', DATABASE_PATH: '.data/e2e.db', ADMIN_PASSWORD: E2E_ADMIN_PASSWORD };
  if (await fetch(url).then(() => true, () => false)) throw new Error('Port 3100 jest zajęty.');
  execFileSync(process.execPath, ['scripts/prepare-e2e.mjs'], { env, stdio: 'inherit' });
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev'], { env, stdio: 'inherit', windowsHide: true });
  const stop = () => { server.kill(); };
  try {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline && server.exitCode === null) {
      if (await fetch(url).then(response => response.ok, () => false)) return stop;
      await delay(250);
    }
    throw new Error('Serwer testowy Piccart nie uruchomił się.');
  } catch (error) {
    stop();
    throw error;
  }
}
