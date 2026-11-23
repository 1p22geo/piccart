import { clearCart, getCart } from '@/lib/cart';
import { userFromRequest } from '@/lib/session';
import { unauthenticatedResponse } from '@/lib/api-error';

export async function GET(request: Request): Promise<Response> {
  const user = userFromRequest(request);
  if (!user) return unauthenticatedResponse();
  return Response.json({ cart: getCart(user.id) });
}

export async function DELETE(request: Request): Promise<Response> {
  const user = userFromRequest(request);
  if (!user) return unauthenticatedResponse();
  return Response.json({ cart: clearCart(user.id) });
}
