import { clearSessionCookieHeader, destroySession, parseCookieHeader } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/constants';

export async function POST(request: Request): Promise<Response> {
  const token = parseCookieHeader(request.headers.get('cookie'))[SESSION_COOKIE];
  if (token) destroySession(token);
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearSessionCookieHeader() } });
}
