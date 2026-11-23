import { productImage } from '@/lib/product-image';
import Link from 'next/link';
import {requireUser} from '@/lib/page-user';
import {AccessDenied} from '../../access-denied';
import {listProducts} from '@/lib/products';
import {formatMoney} from '@/lib/format';
import {S} from '@/lib/strings';
import {AdminStockCell} from '../../components/AdminStockCell';
import {DeleteProduct} from '../../components/ProductForm';
export default async function AdminProducts({searchParams}:{searchParams:Promise<Record<string,string>>}){
  const user=await requireUser('/admin/products');
  if(user.role!=='admin') return <AccessDenied/>;
  const query=await searchParams;
  const result=listProducts({query:'',sort:'newest',page:query.page??1});
  const banner=query.created==='1'?S.ADMIN_BANNER_CREATED:query.updated==='1'?S.ADMIN_BANNER_UPDATED:query.deleted==='1'?S.ADMIN_BANNER_DELETED:null;
  return <><h1>{S.ADMIN_TITLE}</h1>{banner && <p className="banner banner--success" data-testid="admin-banner">{banner}</p>}
  <Link className="btn btn--primary" data-testid="admin-new-link" href="/admin/products/new">{S.ADMIN_NEW}</Link>
  <div className="card table-scroll"><table className="table" data-testid="admin-table"><thead><tr>{[S.ADMIN_PHOTO_HEADER,S.ADMIN_NAME,S.ADMIN_PRICE,S.ADMIN_STOCK,S.ADMIN_ACTIONS_HEADER].map(h=><th key={h}>{h}</th>)}</tr></thead>
  <tbody>{result.products.map(p=><tr data-testid="admin-row" data-product-id={p.id} key={p.id}><td><img src={productImage(p.photos[0])} alt=""/></td><td><Link href={'/admin/products/'+p.id}>{p.name}</Link></td>
  <td>{formatMoney(p.priceCents)}</td><td><AdminStockCell id={p.id} stock={p.stock}/></td><td><Link data-testid="admin-row-edit" href={'/admin/products/'+p.id}>{S.ADMIN_EDIT}</Link> <DeleteProduct id={p.id} row/></td></tr>)}</tbody></table></div>
  <nav className="pager">{result.page>1 && <Link href={'?page='+(result.page-1)}>{S.PAGER_PREV}</Link>}{result.page<result.totalPages && <Link href={'?page='+(result.page+1)}>{S.PAGER_NEXT}</Link>}</nav></>;
}
