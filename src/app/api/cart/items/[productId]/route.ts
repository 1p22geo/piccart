import { removeFromCart, setCartQty } from '@/lib/cart';
import { validateSetQty } from '@/lib/validation';
import { S } from '@/lib/strings';
import { userFromRequest } from '@/lib/session';
import { errorResponse, invalidBodyResponse, notFoundResponse, unauthenticatedResponse } from '@/lib/api-error';

type Ctx = { params: Promise<{ productId: string }> };

export async function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  const user = userFromRequest(request);
  if (!user) return unauthenticatedResponse();

  const { productId } = await params;
  const n = Number(productId);
  if (!Number.isInteger(n) || n < 1) return notFoundResponse();

  const body = await request.json().catch(() => null);
  if (body === null) return invalidBodyResponse();
  const validation = validateSetQty(body);
  if (!validation.ok) return errorResponse('VALIDATION_ERROR', validation.errors);

  const result = setCartQty(user.id, n, validation.value.qty);
  if (!result.ok) {
    if (result.code === 'NOT_FOUND') return notFoundResponse();
    return errorResponse(result.code, result.code === 'LIMIT_PER_LINE' ? [{ field: 'qty', message: S.ERR_QTY_LIMIT }] : undefined, result.conflicts);
  }
  return Response.json({ cart: result.cart });
}

export async function DELETE(_request: Request, { params }: Ctx): Promise<Response> {
  const user = userFromRequest(_request);
  if (!user) return unauthenticatedResponse();

  const { productId } = await params;
  const n = Number(productId);
  if (!Number.isInteger(n) || n < 1) return notFoundResponse();

  const result = removeFromCart(user.id, n);
  if (!result.ok) return notFoundResponse();
  return Response.json({ cart: result.cart });
}
