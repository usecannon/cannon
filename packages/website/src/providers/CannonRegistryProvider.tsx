'use client';

import { inMemoryRegistry } from '@/helpers/cannon';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import {
  DEFAULT_REGISTRY_CONFIG,
  FallbackRegistry,
  OnChainRegistry,
} from '@usecannon/builder';

import React, { createContext, useContext } from 'react';
import { createPublicClient, http } from 'viem';

type RegistryContextType = FallbackRegistry | undefined;

const CannonRegistryContext = createContext<RegistryContextType>(undefined);

type Props = {
  children: React.ReactNode;
};
export const CannonRegistryProvider: React.FC<Props> = ({ children }) => {
  const { getChainById, customTransports } = useCannonChains();

  const onChainRegistries = DEFAULT_REGISTRY_CONFIG.map((config) => {
    const rpcUrl = config.rpcUrl.find(
      (url) => url.startsWith('https://') || url.startsWith('wss://')
    );

    return new OnChainRegistry({
      address: config.address,
      provider: createPublicClient({
        chain: getChainById(config.chainId),
        transport: customTransports[config.chainId] || http(rpcUrl),
      }),
    });
  });

  const fallbackRegistry = new FallbackRegistry([
    inMemoryRegistry,
    ...onChainRegistries,
  ]);

  return (
    <CannonRegistryContext.Provider value={fallbackRegistry}>
      {children}
    </CannonRegistryContext.Provider>
  );
};

export default CannonRegistryProvider;

export const useCannonRegistry = (): FallbackRegistry => {
  const context = useContext(CannonRegistryContext);
  if (context === undefined) {
    throw new Error(
      'useCannonRegistry must be used within a CannonRegistryProvider'
    );
  }
  return context;
};
