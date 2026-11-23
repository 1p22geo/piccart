'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/fetcher';
import { MAX_QTY_PER_LINE } from '@/lib/constants';
import { S } from '@/lib/strings';
import { QtyStepper } from './QtyStepper';

type Props = { productId: number; stock: number; loggedIn: boolean };

export function ProductPurchasePanel({ productId, stock, loggedIn }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const max = Math.max(1, Math.min(stock, MAX_QTY_PER_LINE));
  const outOfStock = stock === 0;

  function add() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    void apiFetch('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, qty }),
    })
      .then(() => {
        window.dispatchEvent(new Event('cart:changed'));
        router.refresh();
        setError(null);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : S.ERR_GENERIC));
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <QtyStepper value={qty} max={max} onChange={setQty} />
      <button type="button" data-testid="add-to-cart" className="btn btn--primary" onClick={add} disabled={outOfStock}>
        {added ? S.ADDED : S.ADD_TO_CART}
      </button>
      {error && <p data-testid="add-to-cart-error" className="field-error">{error}</p>}
    </div>
  );
}
