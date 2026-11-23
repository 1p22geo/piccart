'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/fetcher';
import { S } from '@/lib/strings';

type Props = { next: string };

export function RegisterForm({ next }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function fieldError(field: string): string | null {
    return errors[field] ?? null;
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    void apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    })
      .then(() => {
        router.push(next);
        router.refresh();
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.fields.length > 0) {
          const map: Record<string, string> = {};
          for (const f of err.fields) if (f.field) map[f.field] = f.message;
          setErrors(map);
        } else {
          setErrors({ email: err instanceof Error ? err.message : S.ERR_GENERIC });
        }
      });
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1>{S.REGISTER_TITLE}</h1>
      <form onSubmit={submit} noValidate>
        <label className="field">
          {S.EMAIL_LABEL}
          <input data-testid="register-email" name="email" type="email" autoComplete="email" />
          {fieldError('email') && (
            <span data-testid="field-error" data-field="email" className="field-error">
              {fieldError('email')}
            </span>
          )}
        </label>
        <label className="field">
          {S.USERNAME_LABEL}
          <input data-testid="register-username" name="username" autoComplete="username" />
          {fieldError('username') && (
            <span data-testid="field-error" data-field="username" className="field-error">
              {fieldError('username')}
            </span>
          )}
        </label>
        <label className="field">
          {S.PASSWORD_LABEL}
          <input data-testid="register-password" name="password" type="password" autoComplete="new-password" />
          <span className="field-help">{S.REGISTER_PASSWORD_HELP}</span>
          {fieldError('password') && (
            <span data-testid="field-error" data-field="password" className="field-error">
              {fieldError('password')}
            </span>
          )}
        </label>
        <button type="submit" data-testid="register-submit" className="btn btn--primary">
          {S.REGISTER_SUBMIT}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        {S.REGISTER_HAVE_ACCOUNT.split('?')[0]}?{' '}
        <Link href="/login">{S.NAV_LOGIN}</Link>
      </p>
    </div>
  );
}
