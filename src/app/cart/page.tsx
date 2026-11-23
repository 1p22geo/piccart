import { requireUser } from '@/lib/page-user';
import { getCart } from '@/lib/cart';
import { CartView } from '../components/CartView';
export default async function CartPage() {
  const user = await requireUser('/cart');
  return <CartView initial={getCart(user.id)} />;
}
