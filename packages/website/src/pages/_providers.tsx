'use client';

import dynamic from 'next/dynamic';
import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider, Flex } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

import LogsProvider from '@/providers/logsProvider';
import { theme } from '@/theme/theme';
import { CannonProvidersProvider } from '@/providers/CannonProvidersProvider';

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
          <QueryClientProvider client={queryClient}>
            <LogsProvider>
              <CannonProvidersProvider>
                <NoSsrCannonRegistryProvider>
                  <NoSsrWalletProvider>{children}</NoSsrWalletProvider>
                </NoSsrCannonRegistryProvider>
              </CannonProvidersProvider>
            </LogsProvider>
          </QueryClientProvider>
        </ChakraProvider>
      </CacheProvider>
    </Flex>
  );
}
