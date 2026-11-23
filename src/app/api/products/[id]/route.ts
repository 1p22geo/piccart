import { deleteProduct, getProduct, patchProduct } from '@/lib/products';
import { userFromRequest } from '@/lib/session';
import { errorResponse, forbiddenResponse, notFoundResponse, unauthenticatedResponse, invalidBodyResponse } from '@/lib/api-error';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const n = Number(id);
  const product = getProduct(Number.isInteger(n) ? n : NaN);
  if (!product) return notFoundResponse();
  return Response.json({ product });
}

export async function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  const user = userFromRequest(request);
  if (!user) return unauthenticatedResponse();
  if (user.role !== 'admin') return forbiddenResponse();

  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) return notFoundResponse();

  const body = await request.json().catch(() => null);
  if (body === null) return invalidBodyResponse();
  const result = patchProduct(n, body);
  if (!result.ok) {
    if (result.code === 'NOT_FOUND') return notFoundResponse();
    return errorResponse('VALIDATION_ERROR', result.errors);
  }
  return Response.json({ product: result.product });
}

export async function DELETE(request: Request, { params }: Ctx): Promise<Response> {
  const user = userFromRequest(request);
  if (!user) return unauthenticatedResponse();
  if (user.role !== 'admin') return forbiddenResponse();

  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) return notFoundResponse();
  if (!deleteProduct(n)) return notFoundResponse();
  return new Response(null, { status: 204 });
}
