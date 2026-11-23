'use client';

import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetcher';
import { S } from '@/lib/strings';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      data-testid="nav-logout"
      className="btn btn--secondary btn--sm"
      onClick={() => {
        void apiFetch('/api/auth/logout', { method: 'POST' }).then(() => {
          window.dispatchEvent(new Event('cart:changed'));
          router.refresh();
        });
      }}
    >
      {S.NAV_LOGOUT}
    </button>
  );
}
