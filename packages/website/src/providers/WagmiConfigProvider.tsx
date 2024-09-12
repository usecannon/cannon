'use client';

import { CustomSpinner } from '@/components/CustomSpinner';
import React, { createContext, PropsWithChildren, useContext } from 'react';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { isE2ETest } from '@/constants/misc';
import { getE2eWagmiConfig } from '../../cypress/utils/wagmi-mock-config';

import { useCannonChains } from '@/providers/CannonProvidersProvider';

type WagmiConfig = ReturnType<typeof getDefaultConfig>;
const WagmiConfigContext = createContext<WagmiConfig>({} as WagmiConfig);

export const WagmiConfigProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const { chains, transports } = useCannonChains();

  const wagmiConfig = isE2ETest
    ? getE2eWagmiConfig()
    : getDefaultConfig({
        appName: 'Cannon',
        projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
        chains: chains as any,
        transports,
      });

  return (
    <WagmiConfigContext.Provider value={wagmiConfig}>
      {!wagmiConfig ? <CustomSpinner m="auto" /> : children}
    </WagmiConfigContext.Provider>
  );
};

export const useWagmiConfig = () => {
  const context = useContext(WagmiConfigContext);
  if (context === undefined) {
    throw new Error('useWagmiConfig must be used within a WagmiConfigProvider');
  }
  return context;
};

export default WagmiConfigProvider;
