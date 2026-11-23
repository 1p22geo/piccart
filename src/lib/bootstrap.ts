import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from './constants';
import { getDb } from '@/db';
import { passwordMeetsPolicy } from './validation';

export const ADMIN_EMAIL = 'admin@piccart.local';
export const ADMIN_USERNAME = 'admin';

// Combined alphabet per §6.6 (ambiguous chars like 0/O/1/l/I removed).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_.!?';

function randomChar(chars: string): string {
  return chars[crypto.randomInt(chars.length)];
}

export function generateAdminPassword(): string {
  // Guarantee one char from each required class first, then fill the rest.
  const chars = [
    randomChar('ABCDEFGHJKLMNPQRSTUVWXYZ'),
    randomChar('abcdefghijkmnopqrstuvwxyz'),
    randomChar('23456789'),
  ];
  while (chars.length < 16) {
    chars.push(randomChar(ALPHABET));
  }
  // Fisher–Yates shuffle.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const RULE = '='.repeat(58);

export function ensureAdmin(): void {
  const d = getDb();
  const existing = d.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (existing) return; // never log the password again, never overwrite

  const provided = process.env.ADMIN_PASSWORD;
  let password: string;
  if (provided !== undefined) {
    password = provided.trim();
    if (!passwordMeetsPolicy(password)) {
      throw new Error('ADMIN_PASSWORD does not satisfy the password policy');
    }
  } else {
    password = generateAdminPassword();
  }

  const passwordHash = bcrypt.hashSync(password, BCRYPT_COST);
  try {
    d.prepare('INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
      ADMIN_EMAIL, ADMIN_USERNAME, passwordHash, 'admin',
    );
  } catch (err) {
    // Single-admin partial unique index fired: another worker created it first.
    const message = err instanceof Error ? err.message : '';
    if (message.includes('idx_users_single_admin')) return;
    throw err;
  }

  console.log(RULE);
  console.log('  PICCART ADMIN ACCOUNT CREATED');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Username: ${ADMIN_USERNAME}`);
  console.log(`  Password: ${password}`);
  console.log('  Keep this password safe. It is shown only once.');
  console.log(RULE);
}
