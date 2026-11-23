import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/session';
import { safeNext } from '@/lib/safe-next';
import { LoginForm } from '../components/LoginForm';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Screen 4: guests only — logged-in users are redirected home.
export default async function LoginPage({ searchParams }: Props) {
  const user = getSessionUser((await cookies()).toString());
  if (user) redirect('/');
  const sp = await searchParams;
  const next = safeNext(sp.next);
  return <LoginForm next={next} />;
}
