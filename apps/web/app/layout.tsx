import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Bucr — Your table, actually waiting.',
  description:
    'Reserve tables at Nigeria’s best restaurants. A small refundable credit deposit confirms your booking — show up and get it back, plus a bonus.',
  metadataBase: new URL('https://bucr.ng'),
  openGraph: {
    title: 'Bucr — Your table, actually waiting.',
    description: 'Credit-backed restaurant reservations in Nigeria.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
