import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/products';
import { getSessionUser } from '@/lib/session';
import { formatMoney } from '@/lib/format';
import { S } from '@/lib/strings';
import { StockBadge } from '../../components/StockBadge';
import { ProductPurchasePanel } from '../../components/ProductPurchasePanel';
import { ProductGallery } from '../../components/ProductGallery';

type Props = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const n = Number(id);
  const product = getProduct(Number.isInteger(n) ? n : NaN);
  if (!product) notFound();

  const user = getSessionUser((await cookies()).toString());
  const loggedIn = user !== null;

  return (
    <div className="two-col">
      <ProductGallery photos={product.photos} name={product.name} />
      <div>
        <h1 data-testid="product-title">{product.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span data-testid="product-price" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {formatMoney(product.priceCents)}
          </span>
          <StockBadge stock={product.stock} />
        </div>
        {product.description && (
          <p data-testid="product-description" style={{ color: 'var(--color-muted)' }}>
            {product.description}
          </p>
        )}
        <ProductPurchasePanel productId={product.id} stock={product.stock} loggedIn={loggedIn} />
        <p data-testid="product-meta" style={{ marginTop: 16, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          {S.PRODUCT_DETAIL_META.replace('{id}', String(product.id))}
        </p>
      </div>
    </div>
  );
}
