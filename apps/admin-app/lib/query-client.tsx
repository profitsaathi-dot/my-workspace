'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * React Query configuration for admin app
 * 
 * Features:
 * - Request deduplication (multiple components fetching same data = 1 request)
 * - Automatic caching with 2-minute stale time (admins need real-time data)
 * - Background refetching enabled for admin monitoring
 * - Retry logic for failed requests
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 2 minutes (admins need real-time data)
            staleTime: 2 * 60 * 1000,
            // Cache data for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Refetch on window focus for admin monitoring
            refetchOnWindowFocus: true,
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
            // Retry failed requests 3 times (admins need reliability)
            retry: 3,
            // Exponential backoff for retries
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Retry mutations twice
            retry: 2,
            onError: (error) => {
              console.error('Admin mutation error:', error);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
