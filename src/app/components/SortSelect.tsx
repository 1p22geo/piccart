'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { S } from '@/lib/strings';

const OPTIONS: [string, string][] = [
  ['newest', S.SORT_NEWEST],
  ['name-asc', S.SORT_NAME_ASC],
  ['name-desc', S.SORT_NAME_DESC],
  ['price-asc', S.SORT_PRICE_ASC],
  ['price-desc', S.SORT_PRICE_DESC],
];

export function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get('sort') ?? 'newest';
  const query = params.get('query') ?? '';

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sort = e.target.value;
    const qs = new URLSearchParams();
    if (query) qs.set('query', query);
    if (sort !== 'newest') qs.set('sort', sort);
    router.push(qs.size ? `/?${qs.toString()}` : '/');
    router.refresh();
  }

  return (
    <select data-testid="sort-select" value={current} onChange={onChange} aria-label="sort">
      {OPTIONS.map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  );
}
