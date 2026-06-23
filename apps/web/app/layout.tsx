import type { Metadata } from 'next';
import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Providers } from './providers';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

// Brand fonts (Cormorant Garamond + Jost) are loaded via the @import in globals.css —
// same typefaces as the portals, but at runtime so builds don't depend on Google Fonts.

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
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Providers>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
