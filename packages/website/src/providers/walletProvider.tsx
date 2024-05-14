import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { supportedChains, useProviders } from '@/hooks/providers';
import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

interface IWalletProvider {
  children: ReactNode;
}

function WalletProvider({ children }: IWalletProvider) {
  const { transports } = useProviders();
  const config = getDefaultConfig({
    appName: 'Cannon',
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
    chains: [...supportedChains],
    transports,
  });

  // NOTE: have to hack the style below becuase otherwise it overflows the page.
  // hopefully the class name doesnt change from compile to compile lol
  // related issue: https://github.com/rainbow-me/rainbowkit/issues/1007
  return (
    <WagmiProvider config={config}>
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
