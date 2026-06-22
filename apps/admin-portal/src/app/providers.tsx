'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* forcedTheme locks dark mode — brand is dark-only */}
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ className: 'bg-[#0f2547] text-[#f5f0e8] border border-[rgba(201,168,76,0.2)]' }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
