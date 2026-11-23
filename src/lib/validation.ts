import { COUNTRIES, MAX_PRICE_CENTS, MAX_QTY_PER_LINE, MAX_STOCK } from './constants';
import type { ProductInput, ShippingFields, Validated } from './types';
import { S } from './strings';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

type Errors = { field: string; message: string }[];

function ok<T>(value: T): Validated<T> {
  return { ok: true, value };
}

function fail(errors: Errors): { ok: false; errors: Errors } {
  return { ok: false, errors };
}

function bodyError(): Errors {
  return [{ field: 'body', message: S.ERR_BODY }];
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function emailError(value: unknown): { field: 'email'; message: string } | null {
  const raw = asString(value);
  if (raw === null || raw.trim() === '') return { field: 'email', message: S.ERR_EMAIL_REQUIRED };
  const email = raw.trim();
  if (email.length > 254) return { field: 'email', message: S.ERR_EMAIL_LENGTH };
  if (!EMAIL_PATTERN.test(email)) return { field: 'email', message: S.ERR_EMAIL_FORMAT };
  return null;
}

function usernameError(value: unknown): { field: 'username'; message: string } | null {
  const raw = asString(value);
  if (raw === null || raw.trim() === '') return { field: 'username', message: S.ERR_USERNAME_REQUIRED };
  const username = raw.trim();
  if (username.length < 3 || username.length > 32 || !USERNAME_PATTERN.test(username)) {
    return { field: 'username', message: S.ERR_USERNAME_FORMAT };
  }
  return null;
}

function registrationPasswordError(value: unknown): { field: 'password'; message: string } | null {
  const raw = asString(value);
  if (raw === null || raw === '') return { field: 'password', message: S.ERR_PASSWORD_REQUIRED };
  if (!passwordMeetsPolicy(raw)) {
    if (raw.length < 8 || Buffer.byteLength(raw, 'utf8') > 72) {
      return { field: 'password', message: S.ERR_PASSWORD_LENGTH };
    }
    return { field: 'password', message: S.ERR_PASSWORD_CLASSES };
  }
  return null;
}

// The §6.2 password policy, as a pure predicate. Used by the registration
// validator and by the admin bootstrap (which must reject a weak ADMIN_PASSWORD).
export function passwordMeetsPolicy(plain: string): boolean {
  if (plain.length < 8 || Buffer.byteLength(plain, 'utf8') > 72) return false;
  return /[A-Z]/.test(plain) && /[a-z]/.test(plain) && /[0-9]/.test(plain);
}

export function validateRegistration(input: unknown): Validated<{ email: string; username: string; password: string }> {
  if (!isPlainObject(input)) return fail(bodyError());
  const errors: Errors = [];
  const emailErr = emailError(input.email);
  if (emailErr) errors.push(emailErr);
  const usernameErr = usernameError(input.username);
  if (usernameErr) errors.push(usernameErr);
  const passwordErr = registrationPasswordError(input.password);
  if (passwordErr) errors.push(passwordErr);
  if (errors.length > 0) return fail(errors);
  return ok({
    email: asString(input.email)!.trim().toLowerCase(),
    username: asString(input.username)!.trim(),
    password: asString(input.password)!,
  });
}

export function validateLogin(input: unknown): Validated<{ email: string; password: string }> {
  if (!isPlainObject(input)) return fail(bodyError());
  const errors: Errors = [];
  const emailErr = emailError(input.email);
  if (emailErr) errors.push(emailErr);
  const password = asString(input.password);
  if (password === null || password === '') errors.push({ field: 'password', message: S.ERR_PASSWORD_REQUIRED });
  if (errors.length > 0) return fail(errors);
  const email = asString(input.email)!.trim().toLowerCase();
  const passwordValue = asString(input.password)!;
  return ok({ email, password: passwordValue });
}

export function parsePriceInput(raw: unknown): Validated<number> {
  let value: number | null = null;
  if (typeof raw === 'number' && Number.isFinite(raw)) value = raw;
  else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (PRICE_PATTERN.test(trimmed)) value = Number(trimmed);
  }
  if (value === null) return fail([{ field: 'price', message: S.ERR_PRODUCT_PRICE }]);
  const cents = Math.round(value * 100);
  if (cents < 1 || cents > MAX_PRICE_CENTS) return fail([{ field: 'price', message: S.ERR_PRODUCT_PRICE }]);
  return ok(cents);
}

type ProductPatchCurrent = { name: string; description: string; priceCents: number; stock: number };

export function validateProductInput(
  input: unknown,
  mode: 'create' | 'patch',
  current?: ProductPatchCurrent,
): Validated<ProductInput> {
  if (!isPlainObject(input)) return fail(bodyError());
  const errors: Errors = [];

  let name: string;
  const nameRaw = asString(input.name);
  if (nameRaw !== null) {
    name = nameRaw.trim();
    if (name.length < 1 || name.length > 100) errors.push({ field: 'name', message: S.ERR_PRODUCT_NAME });
  } else if (mode === 'patch') {
    name = current!.name;
  } else {
    name = '';
    errors.push({ field: 'name', message: S.ERR_PRODUCT_NAME });
  }

  let description: string;
  const descriptionRaw = asString(input.description);
  if (descriptionRaw !== null) {
    description = descriptionRaw;
    if (description.length > 2000) errors.push({ field: 'description', message: S.ERR_PRODUCT_DESCRIPTION });
  } else {
    description = mode === 'patch' ? current!.description : '';
  }

  let priceCents: number;
  const pricePresent = input.price !== undefined;
  if (pricePresent) {
    const price = parsePriceInput(input.price);
    if (price.ok) priceCents = price.value;
    else {
      priceCents = 0;
      errors.push({ field: 'price', message: S.ERR_PRODUCT_PRICE });
    }
  } else {
    priceCents = mode === 'patch' ? current!.priceCents : 0;
  }

  let stock: number;
  const stockPresent = input.stock !== undefined;
  if (stockPresent) {
    if (Number.isInteger(input.stock) && (input.stock as number) >= 0 && (input.stock as number) <= MAX_STOCK) {
      stock = input.stock as number;
    } else {
      stock = 0;
      errors.push({ field: 'stock', message: S.ERR_PRODUCT_STOCK });
    }
  } else {
    stock = mode === 'patch' ? current!.stock : 0;
  }

  if (errors.length > 0) return fail(errors);
  return ok({ name, description, priceCents, stock });
}

function qtyError(value: unknown): { field: 'qty'; message: string } | null {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > MAX_QTY_PER_LINE) {
    return { field: 'qty', message: S.ERR_QTY_INVALID };
  }
  return null;
}

export function validateAddToCart(input: unknown): Validated<{ productId: number; qty: number }> {
  if (!isPlainObject(input)) return fail(bodyError());
  const errors: Errors = [];
  if (!Number.isInteger(input.productId) || (input.productId as number) < 1) {
    errors.push({ field: 'productId', message: S.ERR_PRODUCT_ID });
  }
  const qtyRaw = input.qty === undefined ? 1 : input.qty;
  const qtyErr = qtyError(qtyRaw);
  if (qtyErr) errors.push(qtyErr);
  if (errors.length > 0) return fail(errors);
  return ok({ productId: input.productId as number, qty: qtyRaw as number });
}

export function validateSetQty(input: unknown): Validated<{ qty: number }> {
  if (!isPlainObject(input)) return fail(bodyError());
  const qtyErr = qtyError(input.qty);
  if (qtyErr) return fail([qtyErr]);
  return ok({ qty: input.qty as number });
}

function shippingFieldError(
  value: unknown,
  field: keyof ShippingFields,
  label: { required: string; length: string },
  min: number,
  max: number,
): { field: string; message: string } | null {
  const raw = asString(value);
  if (raw === null || raw.trim() === '') return { field, message: label.required };
  const trimmed = raw.trim();
  if (trimmed.length < min || trimmed.length > max) return { field, message: label.length };
  return null;
}

export function validateShipping(input: unknown): Validated<ShippingFields> {
  if (!isPlainObject(input)) return fail(bodyError());
  const errors: Errors = [];

  const fullNameErr = shippingFieldError(
    input.fullName, 'fullName',
    { required: S.ERR_FULLNAME_REQUIRED, length: S.ERR_FULLNAME_LENGTH }, 2, 80,
  );
  if (fullNameErr) errors.push(fullNameErr);

  const address1Err = shippingFieldError(
    input.addressLine1, 'addressLine1',
    { required: S.ERR_ADDRESS1_REQUIRED, length: S.ERR_ADDRESS1_LENGTH }, 5, 120,
  );
  if (address1Err) errors.push(address1Err);

  const address2Raw = asString(input.addressLine2);
  if (address2Raw !== null && address2Raw.length > 120) {
    errors.push({ field: 'addressLine2', message: S.ERR_ADDRESS2_LENGTH });
  }

  const cityErr = shippingFieldError(
    input.city, 'city',
    { required: S.ERR_CITY_REQUIRED, length: S.ERR_CITY_LENGTH }, 2, 60,
  );
  if (cityErr) errors.push(cityErr);

  const postalErr = shippingFieldError(
    input.postalCode, 'postalCode',
    { required: S.ERR_POSTAL_REQUIRED, length: S.ERR_POSTAL_LENGTH }, 3, 16,
  );
  if (postalErr) errors.push(postalErr);

  const countryRaw = asString(input.country);
  if (countryRaw === null || countryRaw.trim() === '') {
    errors.push({ field: 'country', message: S.ERR_COUNTRY_REQUIRED });
  } else if (!(COUNTRIES as readonly string[]).includes(countryRaw.trim())) {
    errors.push({ field: 'country', message: S.ERR_COUNTRY_REQUIRED });
  }

  if (errors.length > 0) return fail(errors);
  return ok({
    fullName: asString(input.fullName)!.trim(),
    addressLine1: asString(input.addressLine1)!.trim(),
    addressLine2: address2Raw ?? '',
    city: asString(input.city)!.trim(),
    postalCode: asString(input.postalCode)!.trim(),
    country: countryRaw!.trim(),
  });
}
