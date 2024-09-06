import { inMemoryRegistry } from '@/helpers/cannon';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import {
  DEFAULT_REGISTRY_ADDRESS,
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
  const { getChainById } = useCannonChains();

  const onChainRegistries = DEFAULT_REGISTRY_CONFIG.map(
    (registry) => registry.chainId
  ).map(
    (chainId: number) =>
      new OnChainRegistry({
        address: DEFAULT_REGISTRY_ADDRESS,
        provider: createPublicClient({
          chain: getChainById(chainId),
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
