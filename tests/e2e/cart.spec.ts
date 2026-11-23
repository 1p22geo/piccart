import { test, expect, add } from './shopping-fixture';
test('E2E-CART-01 card adds one', async ({shopper:p}) => {
  await p.goto('/');
  await p.locator('[data-testid="product-card"][data-product-id="1"]').getByTestId('card-add').click();
  await expect(p.getByTestId('cart-badge-count')).toContainText('1');
});
test('E2E-CART-02 detail adds two', async ({shopper:p}) => {
  await p.goto('/products/1');
  await p.getByTestId('qty-plus').click(); await p.getByTestId('add-to-cart').click();
  await expect(p.getByTestId('cart-badge-count')).toContainText('2');
  await p.getByTestId('nav-cart').click();
  await expect(p.getByTestId('cart-line')).toHaveCount(1);
  await expect(p.getByTestId('qty-value')).toHaveText('2');
});
test('E2E-CART-03 quantity updates both totals', async ({shopper:p}) => {
  await add(p,1,1); await p.goto('/cart');
  for (const [button,total] of [['plus','37,00'],['minus','18,50']]) {
    await p.getByTestId('qty-'+button).click();
    for (const id of ['cart-line-subtotal','cart-subtotal']) await expect(p.getByTestId(id)).toContainText(total);
  }
});
test('E2E-CART-04 stale stock', async ({shopper:p,admin}) => {
  await add(p,8,2); await p.goto('/cart');
  try {
    await admin.request.patch('/api/products/8',{data:{stock:1}});
    await p.getByTestId('qty-plus').click();
    await expect(p.getByTestId('cart-line-error')).toHaveText('Dostępne tylko 1.');
  } finally {await admin.request.patch('/api/products/8',{data:{stock:3}});}
});
test('E2E-CART-05 remove one line', async ({shopper:p}) => {
  await add(p,1,1); await add(p,5,1); await p.goto('/cart');
  await p.getByTestId('cart-line-remove').first().click();
  await expect(p.getByTestId('cart-line')).toHaveCount(1);
  await expect(p.getByTestId('cart-badge-count')).toContainText('1');
});
test('E2E-CART-06 empty after removal', async ({shopper:p}) => {
  await add(p,1,1); await p.goto('/cart'); await p.getByTestId('cart-line-remove').click();
  await expect(p.getByTestId('cart-empty')).toContainText('Przeglądaj produkty');
});
