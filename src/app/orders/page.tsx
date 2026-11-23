import Link from 'next/link';
import {requireUser} from '@/lib/page-user';
import {listOrders} from '@/lib/orders';
import {formatMoney,formatDateTime} from '@/lib/format';
import {S} from '@/lib/strings';
export default async function OrdersPage(){
  const user=await requireUser('/orders');
  const orders=listOrders(user.id);
  return <><h1>{S.ORDERS_TITLE}</h1>{orders.length ? <div data-testid="orders-list">{orders.map(o=>
    <Link className="card order-row" key={o.id} data-testid="order-row" data-order-id={o.id} href={'/orders/'+o.id}>
      <strong>#{o.id}</strong><time>{formatDateTime(o.placedAt)}</time><span>{S.QTY_HEADER} · {o.items.reduce((n,i)=>n+i.qty,0)}</span>
      <strong data-testid="order-row-total">{formatMoney(o.totalCents)}</strong><span>{S.ORDER_STATUS}</span></Link>)}</div> :
    <section className="empty-state" data-testid="orders-empty"><p>{S.ORDERS_EMPTY}</p><Link href="/">{S.CART_BROWSE}</Link></section>}</>;
}
