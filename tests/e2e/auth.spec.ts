import { expect, test } from '@playwright/test';
import { loginViaUi, uniqueEmail, uniqueUsername, SHOPPER_EMAIL, SHOPPER_PASSWORD } from './helpers';
import { S } from '@/lib/strings';

test.describe('auth', () => {
  test('E2E-AUTH-01 register a fresh user via UI → header shows the username (auto-login)', async ({ page }) => {
    const username = uniqueUsername();
    const email = uniqueEmail();
    await page.goto('/register');
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-username').fill(username);
    await page.getByTestId('register-password').fill('Sun5et-Lane');
    await page.getByTestId('register-submit').click();
    await expect(page.getByTestId('nav-username')).toHaveText(`Cześć, ${username}`);
  });

  test('E2E-AUTH-02 register with shopper@piccart.test → email field error', async ({ page }) => {
    await page.goto('/register');
    await page.getByTestId('register-email').fill(SHOPPER_EMAIL);
    await page.getByTestId('register-username').fill(uniqueUsername());
    await page.getByTestId('register-password').fill('Sun5et-Lane');
    await page.getByTestId('register-submit').click();
    const emailError = page.getByTestId('field-error').locator('[data-field="email"]');
    await expect(emailError).toHaveText(S.ERR_EMAIL_TAKEN);
  });

  test('E2E-AUTH-03 register with a weak password → password field error', async ({ page }) => {
    await page.goto('/register');
    await page.getByTestId('register-email').fill(uniqueEmail());
    await page.getByTestId('register-username').fill(uniqueUsername());
    await page.getByTestId('register-password').fill('weak');
    await page.getByTestId('register-submit').click();
    await expect(page.getByTestId('field-error').locator('[data-field="password"]')).toBeVisible();
  });

  test('E2E-AUTH-04 login with a wrong password → login-error banner', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill(SHOPPER_EMAIL);
    await page.getByTestId('login-password').fill('Wrong-Password-1');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText(S.ERR_INVALID_CREDENTIALS);
  });

  test('E2E-AUTH-05 login as shopper → username; logout → login link visible', async ({ page }) => {
    await loginViaUi(page, { email: SHOPPER_EMAIL, password: SHOPPER_PASSWORD });
    await expect(page.getByTestId('nav-username')).toBeVisible();
    await page.getByTestId('nav-logout').click();
    await expect(page.getByTestId('nav-login')).toBeVisible();
  });

  test('E2E-AUTH-06 guest add-to-cart redirects to login?next and returns after login', async ({ page }) => {
    await page.goto('/products/1');
    await page.getByTestId('add-to-cart').click();
    await expect(page).toHaveURL(/\/login\?next=%2Fproducts%2F1/);
    await page.getByTestId('login-email').fill(SHOPPER_EMAIL);
    await page.getByTestId('login-password').fill(SHOPPER_PASSWORD);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/products\/1/);
  });
});
