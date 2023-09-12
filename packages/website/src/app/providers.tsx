'use client';
import { theme } from '@/theme/theme';
import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider } from '@chakra-ui/react';
import { ReactNode } from 'react';
import apolloClient from '@/graphql/ApolloClient';
import { ApolloProvider } from '@apollo/client';
import WalletProvider from '@/app/walletProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const csm = {
    get: () => null,
    set: () => null,
    type: 'localStorage',
  } as const;

  return (
    <CacheProvider>
      <ChakraProvider theme={theme} colorModeManager={csm as any}>
        <ApolloProvider client={apolloClient}>
          <QueryClientProvider client={queryClient}>
            <WalletProvider>{children}</WalletProvider>
          </QueryClientProvider>
        </ApolloProvider>
      </ChakraProvider>
    </CacheProvider>
  );
}
