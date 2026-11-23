import { hashPassword, verifyPassword } from '@/lib/password';

describe('password', () => {
  test('U-PW-01 hash/verify roundtrip', async () => {
    const hash = await hashPassword('Sun5et-Lane');
    await expect(verifyPassword('Sun5et-Lane', hash)).resolves.toBe(true);
  });

  test('U-PW-02 wrong password → verifyPassword false', async () => {
    const hash = await hashPassword('Sun5et-Lane');
    await expect(verifyPassword('Wrong-Password-1', hash)).resolves.toBe(false);
  });

  test('U-PW-03 two hashes of the same password differ (salt)', async () => {
    const a = await hashPassword('Sun5et-Lane');
    const b = await hashPassword('Sun5et-Lane');
    expect(a).not.toBe(b);
  });

  test('U-PW-04 hash matches /^\\$2[aby]\\$10\\$/', async () => {
    const hash = await hashPassword('Sun5et-Lane');
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });
});
