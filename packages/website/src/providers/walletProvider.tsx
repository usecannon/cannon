import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  darkTheme,
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import '@rainbow-me/rainbowkit/styles.css';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { isE2ETest } from '@/constants/misc';
import { getE2eWagmiConfig } from '../../cypress/utils/wagmi-mock-config';

const queryClient = new QueryClient();

interface IWalletProvider {
  children: ReactNode;
}

function WalletProvider({ children }: IWalletProvider) {
  const { chains, transports } = useCannonChains();

  let wagmiConfig: ReturnType<typeof getDefaultConfig>;
  if (isE2ETest) {
    wagmiConfig = getE2eWagmiConfig();
  } else {
    wagmiConfig = getDefaultConfig({
      appName: 'Cannon',
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
      chains: chains as any,
      transports,
    });
  }

  // NOTE: have to hack the style below because otherwise it overflows the page.
  // hopefully the class name doesn't change from compile to compile lol
  // related issue: https://github.com/rainbow-me/rainbowkit/issues/1007
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <style
            dangerouslySetInnerHTML={{
              __html: `
             div.ju367v1i {
               max-height: 90vh;
               overflow: auto;
             }
           `,
            }}
          />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default WalletProvider;
