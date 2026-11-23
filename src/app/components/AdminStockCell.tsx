'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {apiFetch,ApiError} from '@/lib/fetcher';
import {MAX_STOCK} from '@/lib/constants';
import {S} from '@/lib/strings';
export function AdminStockCell({id,stock}:{id:number;stock:number}){
  const router=useRouter(), [busy,setBusy]=useState(false), [error,setError]=useState('');
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setError('');
    const value=new FormData(e.currentTarget).get('stock');
    try {await apiFetch('/api/products/'+id,{method:'PATCH',body:JSON.stringify({stock:Number(value)})});
      router.replace('/admin/products?updated=1'); router.refresh();
    }catch(e){setError(e instanceof ApiError?e.fields[0]?.message??e.message:S.ERR_GENERIC);}
    finally{setBusy(false);}
  }
  return <form onSubmit={save}><input required aria-label={S.ADMIN_STOCK} data-testid="admin-stock-input" type="number" name="stock" min="0" max={MAX_STOCK} defaultValue={stock}/><button className="btn btn--secondary" disabled={busy} data-testid="admin-stock-save">{S.ADMIN_STOCK_SAVE}</button>{error && <span role="alert">{error}</span>}</form>;
}
