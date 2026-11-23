import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser } from './session';
export async function requireUser(path: string) {
  const user = getSessionUser((await cookies()).toString());
  if (!user) redirect('/login?next=' + encodeURIComponent(path));
  return user;
}
