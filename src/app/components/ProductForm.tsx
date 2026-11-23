'use client';
import { productImage } from '@/lib/product-image';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError,apiFetch } from '@/lib/fetcher';
import type { Product } from '@/lib/types';
import { S } from '@/lib/strings';
export function DeleteProduct({id,row=false}:{id:number;row?:boolean}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function remove() {
    if(!window.confirm(S.ADMIN_DELETE_CONFIRM)) return;
    setBusy(true);
    try {await apiFetch('/api/products/'+id,{method:'DELETE'}); router.push('/admin/products?deleted=1'); router.refresh();}
    catch {setError(S.ERR_GENERIC); setBusy(false);}
  }
  return <><button type="button" className="btn btn--danger" disabled={busy} data-testid={row?'admin-row-delete':'admin-delete'} onClick={remove}>{S.ADMIN_DELETE}</button>{error && <span role="alert">{error}</span>}</>;
}
export function ProductForm({product}:{product?:Product}) {
  const router=useRouter();
  const [error,setError]=useState<ApiError|null>(null);
  const [busy,setBusy]=useState(false);
  async function save(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(null);
    const data=Object.fromEntries(new FormData(e.currentTarget));
    try {
      await apiFetch(product?'/api/products/'+product.id:'/api/products',{method:product?'PATCH':'POST',
        body:JSON.stringify({...data,price:String(data.price).replace(',','.'),stock:data.stock===''?null:Number(data.stock)})});
      router.push('/admin/products?'+(product?'updated':'created')+'=1'); router.refresh();
    } catch(e){setError(e instanceof ApiError?e:new ApiError(0,'UNKNOWN',S.ERR_GENERIC)); setBusy(false);}
  }
  const fields=[['name',S.ADMIN_NAME,product?.name],['description',S.ADMIN_DESCRIPTION,product?.description],['price',S.ADMIN_PRICE,product && (product.priceCents/100).toFixed(2)],['stock',S.ADMIN_STOCK,product?.stock??0]] as const;
  return <><h1>{product?S.ADMIN_EDIT+' · '+product.name:S.ADMIN_NEW}</h1><form className="card" noValidate onSubmit={save}>
    {fields.map(([name,label,value])=><label className="field" key={name}>{label}{name==='description'?<textarea data-testid="admin-description" name={name} defaultValue={value}/>:<input data-testid={'admin-'+name} type={name==='stock'?'number':'text'} inputMode={name==='price'?'decimal':undefined} name={name} defaultValue={value}/>}
    {error?.fields.filter(f=>f.field===name).map(f=><span className="field-error" key={name} data-testid="field-error" data-field={name}>{f.message}</span>)}</label>)}
    {product?.photos.map(url=><img key={url} src={productImage(url)} data-testid="photo-thumb" alt="" width="64" height="64"/>)}
    <p>{S.ADMIN_PHOTOS_NOTE}</p>{error && <p role="alert">{error.message}</p>}
    <button className="btn btn--primary" disabled={busy} data-testid="admin-save">{S.ADMIN_SAVE}</button></form>
    {product && <section className="card"><h2>{S.ADMIN_DANGER}</h2><DeleteProduct id={product.id}/></section>}</>;
}
