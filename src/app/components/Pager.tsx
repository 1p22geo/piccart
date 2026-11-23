import Link from 'next/link';
import { S } from '@/lib/strings';

type Props = {
  page: number;
  totalPages: number;
  query: string;
  sort: string;
};

// At the bounds the prev/next controls render as inert <button disabled> —
// Playwright's toBeDisabled() (and E2E-BROWSE-03) needs a real disabled
// attribute, which <a> elements cannot carry.
export function Pager({ page, totalPages, query, sort }: Props) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const qs = new URLSearchParams();
    if (query) qs.set('query', query);
    if (sort && sort !== 'newest') qs.set('sort', sort);
    if (target !== 1) qs.set('page', String(target));
    return qs.size ? `/?${qs.toString()}` : '/';
  };

  return (
    <nav className="pager" aria-label="stronicowanie">
      {page <= 1 ? (
        <button type="button" data-testid="pager-prev" className="btn btn--secondary btn--sm" disabled>
          {S.PAGER_PREV}
        </button>
      ) : (
        <Link href={href(page - 1)} data-testid="pager-prev" className="btn btn--secondary btn--sm">
          {S.PAGER_PREV}
        </Link>
      )}
      <span data-testid="pager-status">
        {S.PAGER_STATUS.replace('{x}', String(page)).replace('{y}', String(totalPages))}
      </span>
      {page >= totalPages ? (
        <button type="button" data-testid="pager-next" className="btn btn--secondary btn--sm" disabled>
          {S.PAGER_NEXT}
        </button>
      ) : (
        <Link href={href(page + 1)} data-testid="pager-next" className="btn btn--secondary btn--sm">
          {S.PAGER_NEXT}
        </Link>
      )}
    </nav>
  );
}
