import { getOrder, listOrders, placeOrder } from '@/lib/orders';
import { validateShipping } from '@/lib/validation';
import { userFromRequest } from '@/lib/session';
import { errorResponse, invalidBodyResponse, notFoundResponse, unauthenticatedResponse } from '@/lib/api-error';

export async function GET(request: Request): Promise<Response> {
  const user = userFromRequest(request);
  if (!user) return unauthenticatedResponse();
  return Response.json({ orders: listOrders(user.id) });
}

export async function POST(request: Request): Promise<Response> {
  const user = userFromRequest(request);
  if (!user) return unauthenticatedResponse();

  const body = await request.json().catch(() => null);
  if (body === null) return invalidBodyResponse();
  const validation = validateShipping(body);
  if (!validation.ok) return errorResponse('VALIDATION_ERROR', validation.errors);

  const result = placeOrder(user.id, validation.value);
  if (!result.ok) {
    return errorResponse(result.code, undefined, result.conflicts);
  }
  return Response.json({ order: result.order }, { status: 201 });
}
