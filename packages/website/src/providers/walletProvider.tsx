import '@rainbow-me/rainbowkit/styles.css';

import {
  getDefaultWallets,
  darkTheme,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import * as chains from '@wagmi/core/chains';
import { Chain } from 'viem/chains';
import { HttpTransport } from 'viem';
import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { createConfig, http } from '@wagmi/core';

const cannonNetwork: Chain = {
  ...chains.localhost,
  id: 13370,
  name: 'Cannon Localhost',
};

export const supportedChains = [
  cannonNetwork,
  ...Object.values(chains),
] as unknown as readonly [Chain, ...Chain[]];

const transports = supportedChains.reduce((prev, curr) => {
  prev[curr.id] = http(curr.rpcUrls.default.http[0]);
  return prev;
}, {} as Record<number, HttpTransport>);

const { connectors } = getDefaultWallets({
  appName: 'Cannon',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
});

interface IWalletProvider {
  children: ReactNode;
}

function WalletProvider({ children }: IWalletProvider) {
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
