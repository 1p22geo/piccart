import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const E2E_ADMIN_PASSWORD = 'e2e-Admin-123'; // satisfies §6.2 policy

export const ADMIN_EMAIL = 'admin@piccart.local';
export const SHOPPER_EMAIL = 'shopper@piccart.test';
export const SHOPPER_PASSWORD = 'Shopper-Docs-1';

let registrationCounter = 0;

export function uniqueEmail(): string {
  registrationCounter += 1;
  return `user${registrationCounter}-${Date.now()}@piccart.test`;
}

export function uniqueUsername(): string {
  registrationCounter += 1;
  return `user${registrationCounter}${Math.floor(Math.random() * 1e4)}`;
}

export type Creds = { email: string; password: string; username?: string };

export async function registerViaApi(
  request: APIRequestContext,
  creds?: Partial<Creds>,
): Promise<{ token: string; creds: Creds }> {
  const email = creds?.email ?? uniqueEmail();
  const username = creds?.username ?? uniqueUsername();
  const password = creds?.password ?? 'Sun5et-Lane';
  const response = await request.post('/api/auth/register', {
    data: { email, username, password },
  });
  expect(response.status()).toBe(201);
  const setCookie = response.headers()['set-cookie'];
  const token = setCookie?.split(';')[0]?.split('=').slice(1).join('=');
  expect(token).toBeTruthy();
  return { token: token!, creds: { email, password, username } };
}

export async function apiLogin(
  request: APIRequestContext,
  creds: Creds,
): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email: creds.email, password: creds.password },
  });
  expect(response.status()).toBe(200);
  const setCookie = response.headers()['set-cookie'];
  const token = setCookie?.split(';')[0]?.split('=').slice(1).join('=');
  expect(token).toBeTruthy();
  return token!;
}

export async function adminCookie(request: APIRequestContext): Promise<string> {
  return apiLogin(request, { email: ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD });
}

export async function createProductViaApi(
  request: APIRequestContext,
  cookie: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: number }> {
  const response = await request.post('/api/products', {
    headers: { cookie: `piccart_sid=${cookie}` },
    data: {
      name: `E2E Product ${Date.now()}`,
      description: 'created via api',
      price: '9.99',
      stock: 10,
      ...overrides,
    },
  });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { product: { id: number } };
  return { id: body.product.id };
}

export async function addToCartViaApi(
  request: APIRequestContext,
  cookie: string,
  productId: number,
  qty: number,
): Promise<void> {
  const response = await request.post('/api/cart/items', {
    headers: { cookie: `piccart_sid=${cookie}` },
    data: { productId, qty },
  });
  expect([201, 200]).toContain(response.status());
}

export async function placeOrderViaApi(
  request: APIRequestContext,
  cookie: string,
  shippingOverrides: Record<string, unknown> = {},
): Promise<number> {
  const response = await request.post('/api/orders', {
    headers: { cookie: `piccart_sid=${cookie}` },
    data: {
      fullName: 'Robin Tan',
      addressLine1: '12 Market Street',
      addressLine2: '',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'Polska',
      ...shippingOverrides,
    },
  });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { order: { id: number } };
  return body.order.id;
}

export async function setStockViaApi(
  request: APIRequestContext,
  cookie: string,
  productId: number,
  stock: number,
): Promise<void> {
  const response = await request.patch(`/api/products/${productId}`, {
    headers: { cookie: `piccart_sid=${cookie}` },
    data: { stock },
  });
  expect(response.status()).toBe(200);
}

export async function deleteProductViaApi(
  request: APIRequestContext,
  cookie: string,
  productId: number,
): Promise<void> {
  const response = await request.delete(`/api/products/${productId}`, {
    headers: { cookie: `piccart_sid=${cookie}` },
  });
  expect(response.status()).toBe(204);
}

export async function loginViaUi(page: Page, creds: Creds): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(creds.email);
  await page.getByTestId('login-password').fill(creds.password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('nav-username')).toBeVisible();
}
