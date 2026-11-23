import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/session';
import { safeNext } from '@/lib/safe-next';
import { RegisterForm } from '../components/RegisterForm';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Screen 3: guests only — logged-in users are redirected home.
export default async function RegisterPage({ searchParams }: Props) {
  const user = getSessionUser((await cookies()).toString());
  if (user) redirect('/');
  const sp = await searchParams;
  const next = safeNext(sp.next);
  return <RegisterForm next={next} />;
}
