import { loginUser } from '@/lib/auth';
import { sessionCookieHeader } from '@/lib/session';
import { errorResponse } from '@/lib/api-error';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const result = await loginUser(body);
  if (!result.ok) {
    if (result.code === 'VALIDATION_ERROR') {
      return errorResponse('VALIDATION_ERROR', result.errors);
    }
    return errorResponse('INVALID_CREDENTIALS');
  }
  return Response.json(
    { user: result.user },
    { status: 200, headers: { 'Set-Cookie': sessionCookieHeader(result.token) } },
  );
}
