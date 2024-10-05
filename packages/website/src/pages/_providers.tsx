'use client';

import dynamic from 'next/dynamic';
import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider, Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';

import LogsProvider from '@/providers/logsProvider';
import { theme } from '@/theme/theme';
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
  const csm = {
    get: () => null,
    set: () => null,
    type: 'localStorage',
  } as const;

  return (
    <Flex
      flexDirection="column"
      backgroundColor="black"
      minHeight="100vh"
      position="relative"
    >
      <CacheProvider>
        <ChakraProvider theme={theme} colorModeManager={csm as any}>
          <LogsProvider>
            <QueryClientProvider client={queryClient}>
              <CannonProvidersProvider>
                <NoSsrCannonRegistryProvider>
                  <NoSsrWalletProvider>{children}</NoSsrWalletProvider>
                </NoSsrCannonRegistryProvider>
              </CannonProvidersProvider>
            </QueryClientProvider>
          </LogsProvider>
        </ChakraProvider>
      </CacheProvider>
    </Flex>
  );
}
