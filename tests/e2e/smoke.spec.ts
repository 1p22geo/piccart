import { expect, test } from '@playwright/test';
import { S } from '@/lib/strings';

test.describe('smoke', () => {
  test('E2E-SMOKE-01 open / → brand, product grid with 9 cards, footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('site-brand')).toBeVisible();
    const grid = page.getByTestId('product-grid');
    await expect(grid).toBeVisible();
    await expect(grid.getByTestId('product-card')).toHaveCount(9);
    await expect(page.getByTestId('site-footer')).toHaveText(S.FOOTER);
  });
});
