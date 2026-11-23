'use client';
import { productImage } from '@/lib/product-image';
import { useState } from 'react';
import Link from 'next/link';
import { QtyStepper } from './QtyStepper';
import { ApiError, apiFetch } from '@/lib/fetcher';
import type { CartView as Cart } from '@/lib/types';
import { MAX_QTY_PER_LINE } from '@/lib/constants';
import { formatMoney } from '@/lib/format';
import { S } from '@/lib/strings';
export function CartView({initial}:{initial:Cart}) {
  const [cart,setCart] = useState(initial);
  const [error,setError] = useState({id:0, message:''});
  const [busy,setBusy] = useState(false);
  async function change(id:number,qty?:number) {
    setBusy(true); setError({id:0,message:''});
    try {
      const result = await apiFetch<{cart:Cart}>('/api/cart/items/'+id, {
        method:qty === undefined ? 'DELETE':'PATCH', body:JSON.stringify(qty === undefined ? undefined : {qty})
      });
      setCart(result.cart); window.dispatchEvent(new Event('cart:changed'));
    } catch(e) {
      const conflict = e instanceof ApiError && e.conflicts[0];
      setError({id,message:conflict ? S.CART_LINE_CONFLICT.replace('{n}',String(conflict.available)) : e instanceof ApiError ? e.fields[0]?.message ?? e.message : S.ERR_GENERIC});
    } finally {setBusy(false);}
  }
  return <><h1>{S.CART_TITLE}</h1>{cart.items.length === 0 ?
    <section className="empty-state" data-testid="cart-empty"><p>{S.CART_EMPTY}</p><Link href="/">{S.CART_BROWSE}</Link></section> :
    <div className="card"><fieldset disabled={busy} className="cart-lines">{cart.items.map(line=><div key={line.productId} className="cart-line" data-testid="cart-line" data-product-id={line.productId}>
      <img src={productImage(line.photo)} alt="" width="48" height="48"/><div className="cart-line__meta">
      <Link data-testid="cart-line-name" href={'/products/'+line.productId}>{line.name}</Link>
      <div data-testid="cart-line-price">{formatMoney(line.unitPriceCents)}</div></div>
      <QtyStepper value={line.qty} max={Math.min(line.stock,MAX_QTY_PER_LINE)} onChange={qty=>change(line.productId,qty)}/>
      <strong data-testid="cart-line-subtotal">{formatMoney(line.lineTotalCents)}</strong>
      <button type="button" className="btn btn--secondary" data-testid="cart-line-remove" onClick={()=>change(line.productId)}>{S.CART_REMOVE}</button>
      {error.id===line.productId && <span className="field-error" role="alert" data-testid="cart-line-error">{error.message}</span>}
    </div>)}</fieldset><div className="cart-footer"><Link href="/">{S.CART_CONTINUE}</Link>
    <strong data-testid="cart-subtotal">{S.CART_SUBTOTAL} · {formatMoney(cart.subtotalCents)}</strong>
    <Link className="btn btn--primary" data-testid="cart-checkout" href="/checkout">{S.CART_CHECKOUT}</Link></div></div>}</>;
}
