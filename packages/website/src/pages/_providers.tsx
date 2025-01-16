'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

import LogsProvider from '@/providers/logsProvider';
import { CannonProvidersProvider } from '@/providers/CannonProvidersProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const NoSsrCannonRegistryProvider = dynamic(
  () => import('@/providers/CannonRegistryProvider'),
  {
    ssr: false,
  }
);

const NoSsrWalletProvider = dynamic(
  () => import('@/providers/walletProvider'),
  {
    ssr: false,
  }
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LogsProvider>
      <QueryClientProvider client={queryClient}>
        <CannonProvidersProvider>
          <NoSsrCannonRegistryProvider>
            <NoSsrWalletProvider>{children}</NoSsrWalletProvider>
          </NoSsrCannonRegistryProvider>
        </CannonProvidersProvider>
      </QueryClientProvider>
    </LogsProvider>
  );
}
