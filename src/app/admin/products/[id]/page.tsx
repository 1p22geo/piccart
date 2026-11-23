import {notFound} from 'next/navigation';
import {requireUser} from '@/lib/page-user';
import {AccessDenied} from '../../../access-denied';
import {ProductForm} from '../../../components/ProductForm';
import {getProduct} from '@/lib/products';
export default async function EditProduct({params}:{params:Promise<{id:string}>}){
  const {id}=await params, user=await requireUser('/admin/products/'+id);
  if(user.role!=='admin') return <AccessDenied/>;
  const product=getProduct(Number(id));
  if(!product) notFound();
  return <ProductForm product={product}/>;
}
