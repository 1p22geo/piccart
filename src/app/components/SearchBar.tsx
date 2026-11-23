'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { S } from '@/lib/strings';

export function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get('query') ?? '';

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = (e.currentTarget.elements.namedItem('q') as HTMLInputElement | null)?.value ?? '';
    router.push(value ? `/?query=${encodeURIComponent(value)}` : '/');
    router.refresh();
  }

  return (
    <form className="search" role="search" onSubmit={submit}>
      <input
        data-testid="search-input"
        name="q"
        defaultValue={current}
        placeholder={S.SEARCH_PLACEHOLDER}
      />
      <button type="submit" data-testid="search-submit" className="btn btn--secondary">
        {S.SEARCH_BUTTON}
      </button>
    </form>
  );
}
