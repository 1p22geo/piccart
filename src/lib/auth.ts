import { getDb } from '@/db';
import { hashPassword, verifyPassword } from './password';
import { S, validateLogin, validateRegistration } from './validation';
import { createSession } from './session';
import type { FieldError, Role, User } from './types';

export type AuthSuccess = { ok: true; user: User; token: string };
export type RegisterResult =
  | AuthSuccess
  | { ok: false; code: 'VALIDATION_ERROR' | 'EMAIL_TAKEN' | 'USERNAME_TAKEN'; errors: FieldError[] };
export type LoginResult =
  | AuthSuccess
  | { ok: false; code: 'INVALID_CREDENTIALS' | 'VALIDATION_ERROR'; errors: FieldError[] };

type UserRow = {
  id: number;
  email: string;
  username: string;
  role: string;
  password_hash: string;
  created_at: string;
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role as Role,
    createdAt: row.created_at,
  };
}

const INVALID_CREDENTIALS: { ok: false; code: 'INVALID_CREDENTIALS'; errors: FieldError[] } = {
  ok: false,
  code: 'INVALID_CREDENTIALS',
  errors: [{ field: '', message: S.ERR_INVALID_CREDENTIALS }],
};

export async function registerUser(input: unknown): Promise<RegisterResult> {
  const validation = validateRegistration(input);
  if (!validation.ok) {
    return { ok: false, code: 'VALIDATION_ERROR', errors: validation.errors };
  }
  const { email, username, password } = validation.value;
  // Hash before any transaction: bcrypt is async, better-sqlite3 transactions stay synchronous.
  const passwordHash = await hashPassword(password);
  const d = getDb();
  try {
    const { userId, token } = d.transaction(() => {
      const info = d
        .prepare('INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)')
        .run(email, username, passwordHash, 'user');
      const id = Number(info.lastInsertRowid);
      return { userId: id, ...createSession(id) };
    })();
    const row = d.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;
    return { ok: true, user: toUser(row), token };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('users.email')) {
      return { ok: false, code: 'EMAIL_TAKEN', errors: [{ field: 'email', message: S.ERR_EMAIL_TAKEN }] };
    }
    if (message.includes('users.username')) {
      return { ok: false, code: 'USERNAME_TAKEN', errors: [{ field: 'username', message: S.ERR_USERNAME_TAKEN }] };
    }
    throw err;
  }
}

export async function loginUser(input: unknown): Promise<LoginResult> {
  const validation = validateLogin(input);
  if (!validation.ok) {
    return { ok: false, code: 'VALIDATION_ERROR', errors: validation.errors };
  }
  const { email, password } = validation.value;
  const row = getDb()
    .prepare('SELECT id, email, username, role, password_hash, created_at FROM users WHERE email = ?')
    .get(email) as UserRow | undefined;
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return INVALID_CREDENTIALS;
  }
  const { token } = createSession(row.id);
  return { ok: true, user: toUser(row), token };
}
