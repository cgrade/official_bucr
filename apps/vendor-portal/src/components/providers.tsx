'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2, // 2 minutes - reduce API calls
            gcTime: 1000 * 60 * 10, // 10 minutes - keep cache longer
            retry: 1,
            refetchOnWindowFocus: false, // Disable refetch on focus for better performance
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 1,
          },
        },
      }),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
