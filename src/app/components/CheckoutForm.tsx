'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { COUNTRIES } from '@/lib/constants';
import { apiFetch, ApiError } from '@/lib/fetcher';
import { formatMoney } from '@/lib/format';
import type { CartView, Order } from '@/lib/types';
import { S } from '@/lib/strings';
const fields = [
  ['fullName','full-name',S.FULLNAME_LABEL],['addressLine1','address1',S.ADDRESS1_LABEL],
  ['addressLine2','address2',S.ADDRESS2_LABEL],['city','city',S.CITY_LABEL],
  ['postalCode','postal',S.POSTAL_LABEL],['country','country',S.COUNTRY_LABEL],
] as const;
export function CheckoutForm({cart}:{cart:CartView}) {
  const [error,setError]=useState<ApiError|null>(null);
  const [busy,setBusy]=useState(false);
  const router=useRouter();
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const {order}=await apiFetch<{order:Order}>('/api/orders',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});
      window.dispatchEvent(new Event('cart:changed')); router.push('/orders/'+order.id+'?placed=1'); router.refresh();
    } catch(e) {setError(e instanceof ApiError ? e : new ApiError(0,'UNKNOWN',S.ERR_GENERIC)); setBusy(false);}
  }
  return <><h1>{S.CHECKOUT_TITLE}</h1>{!cart.items.length || error?.code==='CART_EMPTY' ?
    <div data-testid="checkout-empty" className="empty-state"><p>{S.CART_EMPTY}</p><Link href="/">{S.CART_BROWSE}</Link></div> :
    <div className="two-col"><form data-testid="checkout-form" className="card" noValidate onSubmit={submit}>
      {fields.map(([key,id,label])=><label className="field" key={key}>{label}
      {key==='country'? <select name={key} defaultValue="" data-testid="ship-country"><option disabled value="">{S.COUNTRY_PLACEHOLDER}</option>{COUNTRIES.map(c=><option key={c}>{c}</option>)}</select>:
      <input name={key} data-testid={'ship-'+id}/>}
      {error?.fields.filter(f=>f.field===key).map(f=><span className="field-error" data-testid="field-error" data-field={key} key={key}>{f.message}</span>)}</label>)}
      {error && <div role="alert" className="banner banner--error" data-testid={error.conflicts.length?'checkout-conflict':undefined}>{error.message}
        {error.conflicts.map(c=><p key={c.productId}>{c.name} · zamówiono {c.requested}, dostępne {c.available}</p>)}
        {!!error.conflicts.length && <Link href="/cart">{S.CONFLICT_BACK}</Link>}</div>}
      <p>{S.CHECKOUT_NO_PAYMENT}</p><button className="btn btn--primary" disabled={busy} data-testid="checkout-submit">{S.CHECKOUT_SUBMIT}</button></form>
      <aside className="card" data-testid="checkout-summary"><h2>{S.CHECKOUT_SUMMARY}</h2>{cart.items.map(i=><p key={i.productId}>{i.qty} × {i.name} · {formatMoney(i.lineTotalCents)}</p>)}
      <strong data-testid="checkout-total">{S.ORDER_TOTAL} · {formatMoney(cart.subtotalCents)}</strong></aside></div>}</>;
}
