'use client';

import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { ReactNode, useMemo } from 'react';
import { WagmiProvider } from 'wagmi';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { isE2ETest } from '@/constants/misc';
import { getE2eWagmiConfig } from '../../cypress/utils/wagmi-mock-config';
import '@rainbow-me/rainbowkit/styles.css';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

interface IWalletProvider {
  children: ReactNode;
}

function WalletProvider({ children }: IWalletProvider) {
  const { chains, transports } = useCannonChains();

  const wagmiConfig = useMemo(() => {
    return isE2ETest
      ? getE2eWagmiConfig()
      : getDefaultConfig({
          appName: 'Cannon',
          projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
          chains: chains as any,
          transports,
        });
  }, [chains, transports]);

  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider
        theme={darkTheme({
          overlayBlur: 'none',
        })}
        modalSize="compact"
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}

export default WalletProvider;
