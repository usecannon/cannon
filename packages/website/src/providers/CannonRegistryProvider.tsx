import React, { createContext, useContext } from 'react';
import { inMemoryRegistry } from '@/helpers/cannon';
import {
  FallbackRegistry,
  OnChainRegistry,
  DEFAULT_REGISTRY_ADDRESS,
  DEFAULT_REGISTRY_CONFIG,
} from '@usecannon/builder';
import { findChain } from '@/helpers/rpc';
import { Chain, http, createPublicClient } from 'viem';

type RegistryContextType = FallbackRegistry | undefined;

const CannonRegistryContext = createContext<RegistryContextType>(undefined);

type Props = {
  children: React.ReactNode;
};
export const CannonRegistryProvider: React.FC<Props> = ({ children }) => {
  const onChainRegistries = DEFAULT_REGISTRY_CONFIG.map(
    (registry) => registry.chainId
  ).map(
    (chainId: number) =>
      new OnChainRegistry({
        address: DEFAULT_REGISTRY_ADDRESS,
        provider: createPublicClient({
          chain: findChain(chainId) as Chain,
          transport: http(),
        }),
      })
  );

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

export const useCannonRegistry = (): FallbackRegistry => {
  const context = useContext(CannonRegistryContext);
  if (context === undefined) {
    throw new Error(
      'useCannonRegistry must be used within a CannonRegistryProvider'
    );
  }
  return context;
};
