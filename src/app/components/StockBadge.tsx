'use client';

import { S } from '@/lib/strings';
import { LOW_STOCK_THRESHOLD } from '@/lib/constants';

export function StockBadge({ stock }: { stock: number }) {
  let text: string;
  let cls: string;
  if (stock === 0) {
    text = S.STOCK_OUT;
    cls = 'badge--out';
  } else if (stock <= LOW_STOCK_THRESHOLD) {
    text = S.STOCK_LOW.replace('{n}', String(stock));
    cls = 'badge--low';
  } else {
    text = S.STOCK_IN;
    cls = 'badge--in';
  }
  return <span data-testid="product-stock-badge" className={`badge ${cls}`}>{text}</span>;
}
