import { createProduct, listProducts } from '@/lib/products';
import { validateProductInput } from '@/lib/validation';
import { userFromRequest } from '@/lib/session';
import { errorResponse, forbiddenResponse, unauthenticatedResponse, invalidBodyResponse } from '@/lib/api-error';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const params = {
    query: url.searchParams.get('query') ?? '',
    sort: url.searchParams.get('sort') ?? 'newest',
    page: url.searchParams.get('page') ?? '1',
  };
  const result = listProducts(params);
  return Response.json(result);
}

export async function POST(request: Request): Promise<Response> {
  const user = userFromRequest(request);
  if (!user) return unauthenticatedResponse();
  if (user.role !== 'admin') return forbiddenResponse();

  const body = await request.json().catch(() => null);
  if (body === null) return invalidBodyResponse();
  const validation = validateProductInput(body, 'create');
  if (!validation.ok) return errorResponse('VALIDATION_ERROR', validation.errors);

  const product = createProduct(validation.value);
  return Response.json({ product }, { status: 201 });
}
