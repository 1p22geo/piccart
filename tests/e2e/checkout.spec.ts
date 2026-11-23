import { test, expect, add, ship } from './shopping-fixture';
test('E2E-CHECKOUT-01 complete purchase', async ({shopper:p,admin}) => {
  try {
    await p.goto('/products/1'); await p.getByTestId('qty-plus').click();
    await p.getByTestId('add-to-cart').click(); await expect(p.getByTestId('cart-badge-count')).toContainText('2');
    await p.goto('/products/5'); await p.getByTestId('add-to-cart').click(); await expect(p.getByTestId('cart-badge-count')).toContainText('3');
    await p.goto('/checkout'); await ship(p);
    await expect(p).toHaveURL(/\/orders\/\d+\?placed=1$/);
    await expect(p.getByTestId('order-placed-banner')).toBeVisible();
    await admin.goto('/admin/products');
    await expect(admin.locator('[data-product-id="1"]').getByTestId('admin-stock-input')).toHaveValue('22');
    await p.goto('/cart'); await expect(p.getByTestId('cart-empty')).toBeVisible();
  } finally {
    await admin.request.patch('/api/products/1',{data:{stock:24}});
    await admin.request.patch('/api/products/5',{data:{stock:8}});
  }
});
test('E2E-CHECKOUT-02 missing fields', async ({shopper:p}) => {
  await add(p,1,1); await p.goto('/checkout'); await p.getByTestId('checkout-submit').click();
  for(const field of ['fullName','addressLine1','city','postalCode','country'])
    await expect(p.locator('[data-testid="field-error"][data-field="'+field+'"]')).toBeVisible();
});
test('E2E-CHECKOUT-03 stock conflict', async ({shopper:p,admin}) => {
  await add(p,8,3);
  try {
    await admin.request.patch('/api/products/8',{data:{stock:1}});
    await p.goto('/checkout'); await ship(p);
    await expect(p.getByTestId('checkout-conflict')).toContainText('Enamel Camp Cup');
    await expect(p.getByTestId('checkout-conflict')).toContainText('3');
    await p.goto('/products/8'); await expect(p.getByTestId('product-stock-badge')).toHaveText('Tylko 1');
  } finally {await admin.request.patch('/api/products/8',{data:{stock:3}});}
});
test('E2E-CHECKOUT-04 guest redirect', async ({page}) => {
  await page.goto('/checkout'); await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);
});
