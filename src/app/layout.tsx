import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Piccart',
  description: 'Piccart — demo shop. No real payments.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
