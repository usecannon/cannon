import { supportedChains, useProviders } from '@/hooks/providers';
import {
  darkTheme,
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { createConfig } from '@wagmi/core';
import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import '@rainbow-me/rainbowkit/styles.css';

const { connectors } = getDefaultWallets({
  appName: 'Cannon',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
});

interface IWalletProvider {
  children: ReactNode;
}

function WalletProvider({ children }: IWalletProvider) {
  const { transports } = useProviders();

  const wagmiConfig = createConfig({
    chains: supportedChains,
    connectors,
    transports,
  });

  // NOTE: have to hack the style below becuase otherwise it overflows the page.
  // hopefully the class name doesnt change from compile to compile lol
  // related issue: https://github.com/rainbow-me/rainbowkit/issues/1007
  return (
    <WagmiProvider config={wagmiConfig}>
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
    </WagmiProvider>
  );
}

export default WalletProvider;
