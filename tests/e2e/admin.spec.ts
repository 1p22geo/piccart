import { test, expect, add } from './shopping-fixture';
import { adminCookie, createProductViaApi } from './helpers';
test('E2E-ADMIN-01 shopper access denied', async({shopper:p})=>{
  await p.goto('/admin/products'); await expect(p.getByTestId('access-denied')).toBeVisible(); await expect(p.getByTestId('nav-admin')).toHaveCount(0);
});
test('E2E-ADMIN-02 create product',async({admin:p})=>{
  await p.goto('/admin/products/new');
  for(const [field,value] of [['name','E2E Test Widget'],['price','9.99'],['stock','5']]) await p.getByTestId('admin-'+field).fill(value);
  await p.getByTestId('admin-save').click(); await expect(p.getByTestId('admin-banner')).toHaveText('Produkt utworzony.');
  await p.goto('/'); const card=p.getByTestId('product-card').filter({hasText:'E2E Test Widget'});
  const id=await card.getAttribute('data-product-id');
  try {await card.getByTestId('product-name').click(); await expect(p.getByTestId('photo-thumb')).toHaveCount(3);}
  finally {await p.request.delete('/api/products/'+id);}
});
test('E2E-ADMIN-03 update stock',async({admin:p})=>{
  try {await p.goto('/admin/products'); const row=p.locator('[data-testid="admin-row"][data-product-id="1"]');
    await row.getByTestId('admin-stock-input').fill('5'); await row.getByTestId('admin-stock-save').click();
    await expect(p.getByTestId('admin-banner')).toBeVisible();
    await p.goto('/'); await expect(p.locator('[data-testid="product-card"][data-product-id="1"]')).toContainText('Tylko 5');
  } finally {await p.request.patch('/api/products/1',{data:{stock:24}});}
});
test('E2E-ADMIN-04 edit price',async({admin:p})=>{
  const {id}=await createProductViaApi(p.request,await adminCookie(p.request));
  try {await p.goto('/admin/products/'+id); await expect(p.getByTestId('admin-price')).toHaveValue('9.99');
    await p.getByTestId('admin-price').fill('21.50'); await p.getByTestId('admin-save').click();
    await expect(p.getByTestId('admin-banner')).toBeVisible(); await p.goto('/products/'+id);
    await expect(p.getByTestId('product-price')).toContainText('21,50');
  } finally {await p.request.delete('/api/products/'+id);}
});
test('E2E-ADMIN-05 delete clears shopper cart',async({admin,shopper})=>{
  const {id}=await createProductViaApi(admin.request,await adminCookie(admin.request));
  await add(shopper,id,1); await shopper.goto('/cart'); await expect(shopper.getByTestId('cart-line')).toHaveCount(1);
  await admin.goto('/admin/products/'+id); admin.once('dialog',d=>d.accept()); await admin.getByTestId('admin-delete').click(); await expect(admin.getByTestId('admin-banner')).toBeVisible();
  await shopper.reload(); await expect(shopper.getByTestId('cart-empty')).toBeVisible();
});
test('E2E-ADMIN-06 shopper API forbidden',async({shopper})=>{
  const result=await shopper.request.post('/api/products',{data:{}});
  expect(result.status()).toBe(403); expect((await result.json()).error.code).toBe('FORBIDDEN');
});
