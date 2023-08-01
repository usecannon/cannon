import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import {
  arbitrum,
  goerli,
  mainnet,
  optimism,
  polygon,
  localhost,
  hardhat,
} from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { ReactNode } from 'react';

const cannonLocalHost = {
  ...localhost,
  id: 13370,
  name: 'Cannon Localhost',
  rpcUrl: 'http://127.0.0.1:8545',
};
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    cannonLocalHost,
    hardhat,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [goerli] : []),
  ],
  [publicProvider()]
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
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains} theme={darkTheme()}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default WalletProvider;
