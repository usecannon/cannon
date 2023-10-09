import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import * as Chains from 'wagmi/chains';
import { ReactNode } from 'react';
import _ from 'lodash';
import { createProviders } from '@/helpers/rpc';

const cannonLocalHost = {
  ...Chains.localhost,
  id: 13370,
  name: 'Cannon Localhost',
  rpcUrl: 'http://127.0.0.1:8545',
};
const _chains = Object.values(Chains).filter((item) => _.isObject(item));
export const supportedChains = [..._chains, cannonLocalHost];

const { chains, publicClient, webSocketPublicClient } = configureChains(
  supportedChains,
  createProviders()
);

const { connectors } = getDefaultWallets({
  appName: 'Cannon',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

function WalletProvider({ children }: { children: ReactNode }) {
  // NOTE: have to hack the style below becuase otherwise it overflows the page.
  // hopefully the class name doesnt change from compile to compile lol
  // related issue: https://github.com/rainbow-me/rainbowkit/issues/1007
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains} theme={darkTheme()}>
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
    </WagmiConfig>
  );
}

export default WalletProvider;
