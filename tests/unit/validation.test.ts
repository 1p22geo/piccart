import {
  parsePriceInput,
  validateAddToCart,
  validateLogin,
  validateProductInput,
  validateRegistration,
  validateSetQty,
  validateShipping,
} from '@/lib/validation';

const validRegistration = {
  email: 'Robin@Example.COM ',
  username: 'robin_1',
  password: 'Sun5et-Lane',
};

describe('validation', () => {
  test('U-VAL-01 valid registrations pass; returned email is lowercased and trimmed', () => {
    const result = validateRegistration(validRegistration);
    expect(result).toEqual({
      ok: true,
      value: { email: 'robin@example.com', username: 'robin_1', password: 'Sun5et-Lane' },
    });
  });

  test('U-VAL-02 email: missing/empty → REQUIRED; a@b, "a b@c.de", @x.co → FORMAT; 255-char → LENGTH', () => {
    expect(validateRegistration({ ...validRegistration, email: undefined }).ok).toBe(false);
    expect(validateRegistration({ ...validRegistration, email: '' }).ok).toBe(false);
    expect(validateRegistration({ ...validRegistration, email: 'a@b' }).ok).toBe(false);
    expect(validateRegistration({ ...validRegistration, email: 'a b@c.de' }).ok).toBe(false);
    expect(validateRegistration({ ...validRegistration, email: '@x.co' }).ok).toBe(false);
    const longEmail = `${'a'.repeat(250)}@x.co`; // 255 chars
    expect(validateRegistration({ ...validRegistration, email: longEmail }).ok).toBe(false);
  });

  test('U-VAL-03 username: 2 chars, 33 chars, "space name", "bad!name" → FORMAT; missing → REQUIRED', () => {
    expect(validateRegistration({ ...validRegistration, username: 'ab' }).ok).toBe(false);
    expect(validateRegistration({ ...validRegistration, username: 'a'.repeat(33) }).ok).toBe(false);
    expect(validateRegistration({ ...validRegistration, username: 'space name' }).ok).toBe(false);
    expect(validateRegistration({ ...validRegistration, username: 'bad!name' }).ok).toBe(false);
    expect(validateRegistration({ ...validRegistration, username: undefined }).ok).toBe(false);
  });

  test('U-VAL-04 password: 7 chars → LENGTH; missing class → CLASSES; 72 bytes ok; 73 bytes → LENGTH', () => {
    expect(validateRegistration({ ...validRegistration, password: 'Ab1xxxx' }).ok).toBe(false); // 7 chars
    expect(validateRegistration({ ...validRegistration, password: 'alllower1' }).ok).toBe(false);
    expect(validateRegistration({ ...validRegistration, password: 'ALLUPPER1' }).ok).toBe(false);
    expect(validateRegistration({ ...validRegistration, password: 'NoDigits!!' }).ok).toBe(false);
    expect(validateRegistration({ ...validRegistration, password: 'Aa1' + 'x'.repeat(69) }).ok).toBe(true); // 72
    expect(validateRegistration({ ...validRegistration, password: 'Aa1' + 'x'.repeat(70) }).ok).toBe(false); // 73
  });

  test('U-VAL-05 bad registration yields all field errors at once (email+username+password)', () => {
    const result = validateRegistration({ email: 'nope', username: 'a', password: 'short' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.field).sort()).toEqual(['email', 'password', 'username']);
    }
  });

  test('U-VAL-06 login: valid passes; bad email format errors; password only "required" (no policy)', () => {
    expect(validateLogin({ email: 'a@b.co', password: 'weak' })).toEqual({
      ok: true,
      value: { email: 'a@b.co', password: 'weak' },
    });
    expect(validateLogin({ email: 'nope', password: 'whatever' }).ok).toBe(false);
    expect(validateLogin({ email: 'a@b.co', password: '' }).ok).toBe(false);
  });

  test('U-VAL-07 product create: valid passes with description "" default; name 101 chars / price / stock errors', () => {
    const ok = validateProductInput(
      { name: 'Mug', description: 'A mug.', price: '18.5', stock: 3 },
      'create',
    );
    expect(ok).toEqual({
      ok: true,
      value: { name: 'Mug', description: 'A mug.', priceCents: 1850, stock: 3 },
    });
    expect(validateProductInput({ name: 'Mug', price: '18.5', stock: 3 }, 'create').ok).toBe(true);
    expect(
      validateProductInput({ name: 'x'.repeat(101), price: '18.5', stock: 3 }, 'create').ok,
    ).toBe(false);
    expect(validateProductInput({ name: 'Mug', price: '0.00', stock: 3 }, 'create').ok).toBe(false);
    expect(validateProductInput({ name: 'Mug', price: '18.5', stock: -1 }, 'create').ok).toBe(false);
  });

  test('U-VAL-08 product patch: { stock: 3 } + current → full ProductInput; invalid stock rejected', () => {
    const current = { name: 'Mug', description: 'Old desc', priceCents: 1850, stock: 24 };
    const result = validateProductInput({ stock: 3 }, 'patch', current);
    expect(result).toEqual({
      ok: true,
      value: { name: 'Mug', description: 'Old desc', priceCents: 1850, stock: 3 },
    });
    expect(validateProductInput({ stock: 10_000_001 }, 'patch', current).ok).toBe(false);
  });

  test('U-VAL-09 parsePriceInput: "18.5"→1850, "0.01"→1, "32.00"→3200, 5→500', () => {
    expect(parsePriceInput('18.5')).toEqual({ ok: true, value: 1850 });
    expect(parsePriceInput('0.01')).toEqual({ ok: true, value: 1 });
    expect(parsePriceInput('32.00')).toEqual({ ok: true, value: 3200 });
    expect(parsePriceInput(5)).toEqual({ ok: true, value: 500 });
  });

  test('U-VAL-10 parsePriceInput rejects "1.234", "-2", "0.00", "abc", 10000001', () => {
    for (const raw of ['1.234', '-2', '0.00', 'abc', 10_000_001]) {
      expect(parsePriceInput(raw).ok).toBe(false);
    }
  });

  test('U-VAL-11 addToCart: qty default 1; qty 0/11/2.5/"x" → QTY-INVALID; productId missing/non-integer → PRODUCT-ID', () => {
    expect(validateAddToCart({ productId: 4 })).toEqual({ ok: true, value: { productId: 4, qty: 1 } });
    for (const qty of [0, 11, 2.5, 'x']) {
      expect(validateAddToCart({ productId: 4, qty }).ok).toBe(false);
    }
    expect(validateAddToCart({ qty: 1 }).ok).toBe(false);
    expect(validateAddToCart({ productId: 2.5, qty: 1 }).ok).toBe(false);
    expect(validateAddToCart({ productId: 'x', qty: 1 }).ok).toBe(false);
  });

  test('U-VAL-12 setQty: 1 and 10 pass; 0, 11, non-integer rejected', () => {
    expect(validateSetQty({ qty: 1 })).toEqual({ ok: true, value: { qty: 1 } });
    expect(validateSetQty({ qty: 10 })).toEqual({ ok: true, value: { qty: 10 } });
    for (const qty of [0, 11, 2.5, 'x', null]) {
      expect(validateSetQty({ qty }).ok).toBe(false);
    }
  });

  test('U-VAL-13 shipping: valid passes; each field required/length error; country outside COUNTRIES → COUNTRY-REQUIRED', () => {
    const valid = {
      fullName: 'Robin Tan',
      addressLine1: '12 Market Street',
      addressLine2: '',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'Polska',
    };
    expect(validateShipping(valid)).toEqual({ ok: true, value: valid });
    for (const [field, bad] of [
      ['fullName', 'R'],
      ['addressLine1', '123'],
      ['addressLine2', 'x'.repeat(121)],
      ['city', 'S'],
      ['postalCode', '12'],
      ['country', 'Atlantyda'],
    ] as const) {
      const result = validateShipping({ ...valid, [field]: bad });
      expect(result.ok).toBe(false);
    }
    for (const [field, bad] of [
      ['fullName', ''],
      ['addressLine1', ''],
      ['city', ''],
      ['postalCode', ''],
      ['country', ''],
    ] as const) {
      const result = validateShipping({ ...valid, [field]: bad });
      expect(result.ok).toBe(false);
    }
  });

  test('U-VAL-14 non-object body (null, 42, "x") → single body field error S-ERR-BODY for every validator', () => {
    const validators = [
      () => validateRegistration(null),
      () => validateRegistration(42),
      () => validateRegistration('x'),
      () => validateLogin(null),
      () => validateLogin(42),
      () => validateLogin('x'),
      () => validateProductInput(null, 'create'),
      () => validateProductInput(42, 'create'),
      () => validateProductInput('x', 'patch'),
      () => validateAddToCart(null),
      () => validateAddToCart(42),
      () => validateAddToCart('x'),
      () => validateSetQty(null),
      () => validateSetQty(42),
      () => validateSetQty('x'),
      () => validateShipping(null),
      () => validateShipping(42),
      () => validateShipping('x'),
    ];
    for (const run of validators) {
      const result = run();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe('body');
      }
    }
  });
});
