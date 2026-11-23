import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireUser} from '@/lib/page-user';
import {getOrder} from '@/lib/orders';
import {formatMoney,formatDateTime} from '@/lib/format';
import {S} from '@/lib/strings';
export default async function OrderPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{placed?:string}>}){
  const {id}=await params;
  const user=await requireUser('/orders/'+id);
  const o=getOrder(user.id,Number(id));
  if(!o) notFound();
  const address=o.shipping;
  return <article data-testid="order-detail">{(await searchParams).placed==='1' && <section className="banner banner--success" data-testid="order-placed-banner"><h2>{S.ORDER_PLACED_TITLE}</h2><p>{user.username}, przyjęliśmy Twoje zamówienie #{o.id}.</p><Link href="/">{S.ORDER_PLACED_CONTINUE}</Link></section>}
  <h1>{S.CHECKOUT_TITLE} <span data-testid="order-id">#{o.id}</span></h1><p><span data-testid="order-status">{S.ORDER_STATUS}</span> · <time data-testid="order-placed-at">{formatDateTime(o.placedAt)}</time></p>
  <div className="two-col"><section className="card"><h2>{S.ORDER_ITEMS_TITLE}</h2><table className="table" data-testid="order-items"><thead><tr>{[S.ITEM_HEADER,S.QTY_HEADER,S.PRICE_HEADER,S.ORDER_TOTAL].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{o.items.map(i=><tr key={i.productId}><td>{i.name}</td><td>{i.qty}</td><td>{formatMoney(i.unitPriceCents)}</td><td>{formatMoney(i.lineTotalCents)}</td></tr>)}</tbody></table><p data-testid="order-total"><strong>{S.ORDER_TOTAL} · {formatMoney(o.totalCents)}</strong></p></section>
  <section className="card" data-testid="order-shipping"><h2>{S.ORDER_SHIPPING_TITLE}</h2><address>{address.fullName}<br/>{address.addressLine1}<br/>{address.addressLine2 && <>{address.addressLine2}<br/></>}{address.postalCode} {address.city}<br/>{address.country}</address></section></div><p><Link href="/orders">{S.NAV_ORDERS}</Link></p></article>;
}
