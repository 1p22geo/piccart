'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/fetcher';
import { S } from '@/lib/strings';

type Props = { next: string };

export function LoginForm({ next }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    setError(null);
    setFieldErrors({});
    void apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
      .then(() => {
        router.push(next);
        router.refresh();
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError) {
          if (err.fields.length > 0) {
            const map: Record<string, string> = {};
            for (const f of err.fields) if (f.field) map[f.field] = f.message;
            setFieldErrors(map);
          } else {
            setError(err.message);
          }
        } else {
          setError(err instanceof Error ? err.message : S.ERR_GENERIC);
        }
      });
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1>{S.LOGIN_TITLE}</h1>
      {error && <div className="banner banner--error" data-testid="login-error">{error}</div>}
      <form onSubmit={submit} noValidate>
        <label className="field">
          {S.EMAIL_LABEL}
          <input data-testid="login-email" name="email" type="email" autoComplete="email" />
          {fieldErrors.email && (
            <span data-testid="field-error" data-field="email" className="field-error">{fieldErrors.email}</span>
          )}
        </label>
        <label className="field">
          {S.PASSWORD_LABEL}
          <input data-testid="login-password" name="password" type="password" autoComplete="current-password" />
          {fieldErrors.password && (
            <span data-testid="field-error" data-field="password" className="field-error">{fieldErrors.password}</span>
          )}
        </label>
        <button type="submit" data-testid="login-submit" className="btn btn--primary">
          {S.LOGIN_SUBMIT}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        {S.LOGIN_NO_ACCOUNT}{' '}
        <Link href="/register">{S.NAV_REGISTER}</Link>
      </p>
    </div>
  );
}
