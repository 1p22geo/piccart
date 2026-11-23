'use client';
import {S} from '@/lib/strings';
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="banner banner--error" data-testid="error-page"><h2>{S.ERR_GENERIC}</h2><button onClick={reset} data-testid="error-retry">{S.ERROR_RETRY}</button></section>;}
