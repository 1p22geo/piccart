import bcrypt from 'bcryptjs';
import { loginUser, registerUser } from '@/lib/auth';
import { createSession, destroySession, getSessionUser } from '@/lib/session';
import { closeTestDb, openTestDb, testDb } from './helpers/test-db';

function validRegistration(overrides: Record<string, unknown> = {}) {
  return {
    email: 'robin@example.com',
    username: 'robin',
    password: 'Sun5et-Lane',
    ...overrides,
  };
}

beforeEach(() => { openTestDb(); });
afterAll(() => { closeTestDb(); });

describe('auth domain', () => {
  test('U-AUTH-01 register success returns user + token, session row exists, role user', async () => {
    const result = await registerUser(validRegistration());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.role).toBe('user');
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    const d = testDb();
    const row = d.prepare('SELECT user_id FROM sessions WHERE token = ?').get(result.token);
    expect(row).toBeDefined();
  });

  test('U-AUTH-02 case-different email → EMAIL_TAKEN', async () => {
    await registerUser(validRegistration());
    const result = await registerUser(validRegistration({ email: 'ROBIN@example.com', username: 'other' }));
    expect(result).toEqual({
      ok: false,
      code: 'EMAIL_TAKEN',
      errors: [{ field: 'email', message: expect.any(String) }],
    });
  });

  test('U-AUTH-03 case-different username → USERNAME_TAKEN', async () => {
    await registerUser(validRegistration());
    const result = await registerUser(validRegistration({ email: 'other@example.com', username: 'ROBIN' }));
    expect(result).toEqual({
      ok: false,
      code: 'USERNAME_TAKEN',
      errors: [{ field: 'username', message: expect.any(String) }],
    });
  });

  test('U-AUTH-04 stored email lowercased', async () => {
    await registerUser(validRegistration({ email: 'Robin@Example.COM' }));
    const row = testDb().prepare('SELECT email FROM users WHERE id = 1').get() as { email: string };
    expect(row.email).toBe('robin@example.com');
  });

  test('U-AUTH-05 login success returns token', async () => {
    await registerUser(validRegistration());
    const result = await loginUser({ email: 'robin@example.com', password: 'Sun5et-Lane' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.token).toMatch(/^[0-9a-f]{64}$/);
  });

  test('U-AUTH-06 login with different-case email succeeds', async () => {
    await registerUser(validRegistration());
    const result = await loginUser({ email: 'Robin@Example.COM', password: 'Sun5et-Lane' });
    expect(result.ok).toBe(true);
  });

  test('U-AUTH-07 wrong password → INVALID_CREDENTIALS', async () => {
    await registerUser(validRegistration());
    const result = await loginUser({ email: 'robin@example.com', password: 'Wrong-Password-1' });
    expect(result).toMatchObject({ ok: false, code: 'INVALID_CREDENTIALS' });
  });

  test('U-AUTH-08 unknown email → the same code and no wording differences', async () => {
    const wrongPassword = await loginUser({ email: 'robin@example.com', password: 'Wrong-Password-1' });
    const unknownEmail = await loginUser({ email: 'nobody@example.com', password: 'Wrong-Password-1' });
    expect(wrongPassword.ok).toBe(false);
    expect(unknownEmail.ok).toBe(false);
    if (!wrongPassword.ok && !unknownEmail.ok) {
      expect(unknownEmail.code).toBe(wrongPassword.code);
      expect(unknownEmail.errors).toEqual(wrongPassword.errors);
    }
  });

  test('U-AUTH-09 expired session → getSessionUser returns null and deletes the row', () => {
    const result = registerUserSyncSetup();
    const d = testDb();
    d.prepare('UPDATE sessions SET expires_at = ? WHERE token = ?').run(
      '2000-01-01T00:00:00.000Z', result.token,
    );
    expect(getSessionUser(`piccart_sid=${result.token}`)).toBeNull();
    const row = d.prepare('SELECT token FROM sessions WHERE token = ?').get(result.token);
    expect(row).toBeUndefined();
  });

  test('U-AUTH-10 destroySession invalidates the cookie token', () => {
    const { token } = registerUserSyncSetup();
    expect(getSessionUser(`piccart_sid=${token}`)).not.toBeNull();
    destroySession(token);
    expect(getSessionUser(`piccart_sid=${token}`)).toBeNull();
  });
});

function registerUserSyncSetup(): { token: string; userId: number } {
  const d = testDb();
  const hash = bcrypt.hashSync('Sun5et-Lane', 10);
  d.prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)').run(
    'robin@example.com', 'robin', hash,
  );
  const { token } = createSession(1);
  return { token, userId: 1 };
}
