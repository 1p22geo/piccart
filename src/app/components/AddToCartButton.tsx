'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/fetcher';
import { S } from '@/lib/strings';

type Props = {
  productId: number;
  stock: number;
  loggedIn: boolean;
  qty?: number;
  testId?: 'card-add' | 'add-to-cart';
};

export function AddToCartButton({ productId, stock, loggedIn, qty = 1, testId = 'card-add' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [label, setLabel] = useState<string>(S.ADD_TO_CART);
  const [error, setError] = useState<string | null>(null);

  function click() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    void apiFetch<{ cart: unknown }>('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, qty }),
    })
      .then(() => {
        window.dispatchEvent(new Event('cart:changed'));
        router.refresh();
        setLabel(S.ADDED);
        setTimeout(() => setLabel(S.ADD_TO_CART), 1500);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : S.ERR_GENERIC);
      });
  }

  return (
    <>
      <button
        type="button"
        data-testid={testId}
        className="btn btn--primary btn--sm"
        disabled={stock === 0}
        onClick={click}
      >
        {label}
      </button>
      {testId === 'add-to-cart' && error && (
        <p data-testid="add-to-cart-error" className="field-error">{error}</p>
      )}
    </>
  );
}
