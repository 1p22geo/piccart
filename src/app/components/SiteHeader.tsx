import Link from 'next/link';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/session';
import { S } from '@/lib/strings';
import { SearchBar } from './SearchBar';
import { CartBadge } from './CartBadge';
import { LogoutButton } from './LogoutButton';

export async function SiteHeader() {
  const cookieHeader = (await cookies()).toString();
  const user = getSessionUser(cookieHeader);

  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__row">
          <Link href="/" data-testid="site-brand" className="site-brand">
            {S.BRAND}
          </Link>
          <SearchBar />
          <nav className="header__nav">
            {user ? (
              <>
                <CartBadge />
                <Link href="/orders" data-testid="nav-orders">{S.NAV_ORDERS}</Link>
                {user.role === 'admin' && (
                  <Link href="/admin/products" data-testid="nav-admin">{S.NAV_ADMIN}</Link>
                )}
                <span data-testid="nav-username">{S.NAV_HI.replace('{username}', user.username)}</span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/cart" data-testid="nav-cart">{S.NAV_CART}</Link>
                <Link href="/login" data-testid="nav-login">{S.NAV_LOGIN}</Link>
                <Link href="/register" data-testid="nav-register">{S.NAV_REGISTER}</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
