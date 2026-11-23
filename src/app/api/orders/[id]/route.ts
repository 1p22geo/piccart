import { getOrder } from '@/lib/orders';
import { userFromRequest } from '@/lib/session';
import { notFoundResponse, unauthenticatedResponse } from '@/lib/api-error';

type Ctx = { params: Promise<{ id: string }> };

// Owner-only (§7.18): non-owners get 404, never 403 — do not leak existence.
export async function GET(request: Request, { params }: Ctx): Promise<Response> {
  const user = userFromRequest(request);
  if (!user) return unauthenticatedResponse();

  const { id } = await params;
  const n = Number(id);
  const order = getOrder(user.id, Number.isInteger(n) ? n : NaN);
  if (!order) return notFoundResponse();
  return Response.json({ order });
}
