'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { S } from '@/lib/strings';

// Rendered only for signed-in users (SiteHeader decides); guests get a plain
// static Cart link without a count.
export function CartBadge() {
  const [count, setCount] = useState<number | null>(null);

  function load() {
    fetch('/api/cart')
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { cart: { totalQty: number } } | null) => {
        if (body) setCount(body.cart.totalQty);
      })
      .catch(() => setCount(null));
  }

  useEffect(() => {
    load();
    window.addEventListener('cart:changed', load);
    return () => window.removeEventListener('cart:changed', load);
  }, []);

  return (
    <Link href="/cart" data-testid="nav-cart">
      {S.NAV_CART}
      {count !== null && <span data-testid="cart-badge-count"> ({count})</span>}
    </Link>
  );
}
