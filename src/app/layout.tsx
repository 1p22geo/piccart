import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from './components/SiteHeader';
import { S } from '@/lib/strings';

export const metadata: Metadata = {
  title: S.BRAND,
  description: S.FOOTER,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>
        <SiteHeader />
        <main className="container">
          {children}
        </main>
        <footer className="footer">
          <div className="footer__inner" data-testid="site-footer">
            {S.FOOTER}
          </div>
        </footer>
      </body>
    </html>
  );
}
