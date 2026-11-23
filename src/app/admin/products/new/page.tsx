import {requireUser} from '@/lib/page-user';
import {AccessDenied} from '../../../access-denied';
import {ProductForm} from '../../../components/ProductForm';
export default async function NewProduct(){
  const user=await requireUser('/admin/products/new');
  return user.role==='admin'?<ProductForm/>:<AccessDenied/>;
}
