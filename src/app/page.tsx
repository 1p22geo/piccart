import { productImage } from '@/lib/product-image';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { listProducts } from '@/lib/products';
import { getSessionUser } from '@/lib/session';
import { formatMoney } from '@/lib/format';
import { S } from '@/lib/strings';
import { StockBadge } from './components/StockBadge';
import { SortSelect } from './components/SortSelect';
import { Pager } from './components/Pager';
import { AddToCartButton } from './components/AddToCartButton';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = typeof sp.query === 'string' ? sp.query : '';
  const sort = typeof sp.sort === 'string' ? sp.sort : 'newest';
  const page = typeof sp.page === 'string' ? sp.page : '1';

  const result = listProducts({ query, sort, page });
  const user = getSessionUser((await cookies()).toString());
  const loggedIn = user !== null;

  return (
    <div>
      <h1>{S.HOME_TITLE}</h1>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        <SortSelect />
      </div>

      {result.products.length === 0 ? (
        <div className="empty-state" data-testid="catalog-empty">
          <h2>{query ? S.EMPTY_CATALOG_QUERY.replace('{query}', query) : S.EMPTY_CATALOG_ALL}</h2>
          <Link href="/" className="btn btn--primary">{S.NOT_FOUND_BACK}</Link>
        </div>
      ) : (
        <div className="grid-products" data-testid="product-grid">
          {result.products.map((product) => (
            <div key={product.id} className="product-card" data-testid="product-card" data-product-id={product.id}>
              <Link href={`/products/${product.id}`}>
                <img src={productImage(product.photos[0])} alt={product.name} width={200} height={200} loading="lazy" />
              </Link>
              <div className="product-card__body">
                <Link href={`/products/${product.id}`} data-testid="product-name">
                  {product.name}
                </Link>
                <div data-testid="product-price">{formatMoney(product.priceCents)}</div>
                <StockBadge stock={product.stock} />
                <div className="product-card__footer">
                  <AddToCartButton
                    productId={product.id}
                    stock={product.stock}
                    loggedIn={loggedIn}
                    testId="card-add"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pager page={result.page} totalPages={result.totalPages} query={query} sort={sort} />
    </div>
  );
}
