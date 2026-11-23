import { expect, test } from '@playwright/test';
import { adminCookie, createProductViaApi, deleteProductViaApi } from './helpers';

test.describe('browse', () => {
  test('E2E-BROWSE-01 search czapka → 1 card; search zzz → empty state', async ({ page }) => {
    await page.goto('/');
    const search = page.getByTestId('search-input');
    await search.fill('czapka');
    await page.getByTestId('search-submit').click();
    await expect(page.getByTestId('product-card')).toHaveCount(1);
    await expect(page.getByTestId('product-card').getByTestId('product-name')).toContainText('Czapka wełniana');

    await page.getByTestId('search-input').fill('zzz');
    await page.getByTestId('search-submit').click();
    await expect(page.getByTestId('catalog-empty')).toBeVisible();
  });

  test('E2E-BROWSE-02 sort Price: low to high → first card is Emaliowany kubek turystyczny (12,40 zł)', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('sort-select').selectOption('price-asc');
    const first = page.getByTestId('product-card').first();
    await expect(first.getByTestId('product-name')).toContainText('Emaliowany kubek turystyczny');
    await expect(first.getByTestId('product-price')).toContainText('12,40');
  });

  test('E2E-BROWSE-03 17 products → page 2 shows 5 cards, status "Page 2 of 2", next disabled', async ({
    page,
    request,
  }) => {
    const admin = await adminCookie(request);
    const ids: number[] = [];
    try {
      for (let i = 0; i < 8; i++) {
        const product = await createProductViaApi(request, admin, { name: `Dodatkowy ${i}` });
        ids.push(product.id);
      }
      await page.goto('/?page=2');
      await expect(page.getByTestId('product-card')).toHaveCount(5);
      await expect(page.getByTestId('pager-status')).toHaveText('Strona 2 z 2');
      await expect(page.getByTestId('pager-next')).toBeDisabled();
    } finally {
      for (const id of ids) await deleteProductViaApi(request, admin, id);
    }
  });

  test('E2E-BROWSE-04 /products/1 → title, price, 3 thumbs; thumb click changes main src', async ({ page }) => {
    await page.goto('/products/1');
    await expect(page.getByTestId('product-title')).toContainText('Ceramiczny kubek Aurora');
    await expect(page.getByTestId('product-price')).toContainText('18,50');
    await expect(page.getByTestId('photo-thumb')).toHaveCount(3);
    const mainBefore = await page.getByTestId('photo-main').getAttribute('src');
    await page.locator('[data-testid="photo-thumb"][data-photo-index="1"]').click();
    const mainAfter = await page.getByTestId('photo-main').getAttribute('src');
    expect(mainAfter).not.toBe(mainBefore);
    expect(mainAfter).toContain('seed=pcc-mug-2');
  });

  test('E2E-BROWSE-05 /products/3 out of stock; /products/8 "Tylko 3"', async ({ page }) => {
    await page.goto('/products/3');
    await expect(page.getByTestId('product-stock-badge')).toHaveText('Brak na stanie');
    await expect(page.getByTestId('add-to-cart')).toBeDisabled();

    await page.goto('/products/8');
    await expect(page.getByTestId('product-stock-badge')).toHaveText('Tylko 3');
  });
});
