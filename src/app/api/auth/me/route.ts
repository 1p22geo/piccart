import { getSessionUser } from '@/lib/session';

export async function GET(request: Request): Promise<Response> {
  const user = getSessionUser(request.headers.get('cookie'));
  return Response.json({ user });
}
