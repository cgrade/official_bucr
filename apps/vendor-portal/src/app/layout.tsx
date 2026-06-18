import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });

export const metadata: Metadata = {
  title: 'Bucr Vendor Portal',
  description: 'Manage your restaurant bookings and orders',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          storageKey="bucr-vendor-theme"
        >
          <Providers>
            {children}
            <Toaster 
              position="top-right" 
              richColors 
              toastOptions={{
                className: 'dark:bg-slate-800 dark:text-slate-100',
              }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
