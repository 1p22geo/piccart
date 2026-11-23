import Link from 'next/link';
import {S} from '@/lib/strings';
export function AccessDenied(){return <section className="card" data-testid="access-denied"><h1>{S.FORBIDDEN_TITLE}</h1><p>{S.FORBIDDEN_BODY}</p><Link href="/">{S.FORBIDDEN_BACK}</Link></section>;}
