import type { Metadata } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Providers } from '@/components/providers';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';

// Brand fonts (canonical: CLAUDE.md §2)
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bucr — Vendor Portal',
  description: 'Manage your restaurant bookings, orders, and performance on Bucr.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${cormorant.variable} ${jost.variable} font-sans`}>
        {/* forcedTheme locks dark mode — brand is dark-only */}
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <Providers>
            {children}
            <Toaster
              position="top-right"
              richColors
              toastOptions={{ className: 'bg-[#0f2547] text-[#f5f0e8] border border-[rgba(201,168,76,0.2)] font-sans' }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
