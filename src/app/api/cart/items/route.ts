import { addToCart } from '@/lib/cart';
import { S, validateAddToCart } from '@/lib/validation';
import { userFromRequest } from '@/lib/session';
import { errorResponse, invalidBodyResponse, notFoundResponse, unauthenticatedResponse } from '@/lib/api-error';

export async function POST(request: Request): Promise<Response> {
  const user = userFromRequest(request);
  if (!user) return unauthenticatedResponse();

  const body = await request.json().catch(() => null);
  if (body === null) return invalidBodyResponse();
  const validation = validateAddToCart(body);
  if (!validation.ok) return errorResponse('VALIDATION_ERROR', validation.errors);

  const result = addToCart(user.id, validation.value);
  if (!result.ok) {
    if (result.code === 'NOT_FOUND') return notFoundResponse();
    return errorResponse(result.code, result.code === 'LIMIT_PER_LINE' ? [{ field: 'qty', message: S.ERR_QTY_LIMIT }] : undefined, result.conflicts);
  }
  return Response.json({ cart: result.cart }, { status: 201 });
}
