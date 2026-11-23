import { test as base, expect, type Page } from '@playwright/test';
import { registerViaApi, adminCookie, addToCartViaApi } from './helpers';

export const test = base.extend<{ shopper: Page; admin: Page }>({
  shopper: async ({ page }, use) => {
    await registerViaApi(page.request);
    await use(page);
  },
  admin: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL });
    try {
      await adminCookie(context.request);
      await use(await context.newPage());
    } finally { await context.close(); }
  },
});
export { expect };
export async function add(page: Page, id: number, qty: number) {
  const cookies = await page.context().cookies();
  await addToCartViaApi(page.request, cookies.find(c => c.name === 'piccart_sid')!.value, id, qty);
}
export async function ship(page: Page) {
  for (const [field, value] of Object.entries({'full-name':'Jan Nowak', address1:'Lipowa 12', city:'Warszawa', postal:'00-001'}))
    await page.getByTestId('ship-' + field).fill(value);
  await page.getByTestId('ship-country').selectOption('Polska');
  await page.getByTestId('checkout-submit').click();
}
