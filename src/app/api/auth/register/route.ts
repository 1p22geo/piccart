import { registerUser } from '@/lib/auth';
import { sessionCookieHeader } from '@/lib/session';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const result = await registerUser(body);
  if (!result.ok) {
    const status = result.code === 'VALIDATION_ERROR' ? 400 : 409;
    return Response.json(
      { error: { code: result.code, message: result.errors[0]?.message ?? '', fields: result.errors } },
      { status },
    );
  }
  return Response.json(
    { user: result.user },
    { status: 201, headers: { 'Set-Cookie': sessionCookieHeader(result.token) } },
  );
}
