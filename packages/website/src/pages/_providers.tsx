'use client';

import LogsProvider from '@/providers/logsProvider';
import WalletProvider from '@/providers/walletProvider';
import { theme } from '@/theme/theme';
import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  const csm = {
    get: () => null,
    set: () => null,
    type: 'localStorage',
  } as const;

  return (
    <CacheProvider>
      <ChakraProvider theme={theme} colorModeManager={csm as any}>
        <QueryClientProvider client={queryClient}>
          <LogsProvider>
            <WalletProvider>{children}</WalletProvider>
          </LogsProvider>
        </QueryClientProvider>
      </ChakraProvider>
    </CacheProvider>
  );
}
