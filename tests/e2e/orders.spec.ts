import { test, expect, add } from './shopping-fixture';
import { registerViaApi } from './helpers';
import type { Page } from '@playwright/test';
async function order(p:Page) {
  await add(p,4,2);
  const response=await p.request.post('/api/orders',{data:{fullName:'Jan Nowak',addressLine1:'Lipowa 12',city:'Warszawa',postalCode:'00-001',country:'Polska',addressLine2:''}});
  expect(response.status()).toBe(201);
  return (await response.json()).order.id as number;
}
test('E2E-ORDERS-01 history opens order',async({shopper:p})=>{
  const id=await order(p); await p.goto('/orders');
  const row=p.getByTestId('order-row');
  await expect(row).toContainText('2'); await expect(row.getByTestId('order-row-total')).toContainText('44,00');
  await row.click(); await expect(p).toHaveURL(new RegExp('/orders/'+id+'$'));
});
test('E2E-ORDERS-02 snapshots and shipping',async({shopper:p})=>{
  await p.goto('/orders/'+await order(p));
  await expect(p.getByTestId('order-shipping')).toContainText('Lipowa 12');
  await expect(p.getByTestId('order-items')).toContainText('Stalowa butelka termiczna');
  await expect(p.getByTestId('order-items')).toContainText('22,00');
  await expect(p.getByTestId('order-total')).toContainText('44,00');
});
test('E2E-ORDERS-03 another account cannot see order',async({shopper:p})=>{
  const id=await order(p); await p.context().clearCookies(); await registerViaApi(p.request);
  await p.goto('/orders/'+id); await expect(p.getByTestId('not-found-page')).toBeVisible();
});
