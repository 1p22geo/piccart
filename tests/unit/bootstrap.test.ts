import { ensureAdmin } from '@/lib/bootstrap';
import { closeTestDb, openTestDb, testDb } from './helpers/test-db';

function countAdmins(): number {
  return (testDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get() as { n: number }).n;
}

function adminPasswordHash(): string {
  const row = testDb().prepare("SELECT password_hash FROM users WHERE role = 'admin'").get() as { password_hash: string };
  return row.password_hash;
}

function policyCompliant(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 72 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

beforeEach(() => {
  openTestDb();
  delete process.env.ADMIN_PASSWORD;
});
afterAll(() => { closeTestDb(); });

describe('admin bootstrap', () => {
  test('U-BOOT-01 first call creates the admin, logs the box, password satisfies policy', () => {
    const logs: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    ensureAdmin();
    spy.mockRestore();

    expect(countAdmins()).toBe(1);
    expect(adminPasswordHash()).toMatch(/^\$2[aby]\$10\$/);
    const output = logs.join('\n');
    expect(output).toContain('PICCART ADMIN ACCOUNT CREATED');
    // The printed password (16 chars) must satisfy the policy.
    const printed = logs.find((l) => l.includes('Password:'));
    expect(printed).toBeDefined();
    const password = printed!.split('Password:')[1].trim();
    expect(password).toHaveLength(16);
    expect(policyCompliant(password)).toBe(true);
  });

  test('U-BOOT-02 second call is a no-op (row count unchanged, nothing logged)', () => {
    ensureAdmin();
    const logs: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    ensureAdmin();
    spy.mockRestore();
    expect(countAdmins()).toBe(1);
    expect(logs).toHaveLength(0);
  });

  test('U-BOOT-03 ADMIN_PASSWORD env is used verbatim (log shows it)', () => {
    process.env.ADMIN_PASSWORD = 'Docs-Admin-1';
    const logs: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    ensureAdmin();
    spy.mockRestore();
    expect(countAdmins()).toBe(1);
    expect(logs.join('\n')).toContain('Password: Docs-Admin-1');
  });

  test('U-BOOT-04 policy-violating ADMIN_PASSWORD throws before any insert', () => {
    process.env.ADMIN_PASSWORD = 'weak';
    expect(() => ensureAdmin()).toThrow();
    expect(countAdmins()).toBe(0);
  });
});
