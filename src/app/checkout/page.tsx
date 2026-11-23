import { requireUser } from '@/lib/page-user';
import { getCart } from '@/lib/cart';
import { CheckoutForm } from '../components/CheckoutForm';
export default async function CheckoutPage() {
  const user=await requireUser('/checkout');
  return <CheckoutForm cart={getCart(user.id)}/>;
}
