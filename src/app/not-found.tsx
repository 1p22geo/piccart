import Link from 'next/link';
import {S} from '@/lib/strings';
export default function NotFound(){return <section className="empty-state" data-testid="not-found-page"><h1>{S.NOT_FOUND_TITLE}</h1><p>{S.NOT_FOUND_BODY}</p><Link href="/">{S.NOT_FOUND_BACK}</Link></section>;}
