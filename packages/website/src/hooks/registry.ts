import { inMemoryRegistry } from '@/helpers/cannon';
import { findChain } from '@/helpers/rpc';
import { FallbackRegistry, OnChainRegistry } from '@usecannon/builder';
import { DEFAULT_REGISTRY_ADDRESS, DEFAULT_REGISTRY_CONFIG } from '@usecannon/cli/dist/src/constants';
import { useEffect, useMemo, useState } from 'react';
import * as viem from 'viem';

export function useCannonRegistry() {
  return useMemo(() => {
    const registryChainIds = DEFAULT_REGISTRY_CONFIG.map((registry) => registry.chainId);

    const onChainRegistries = registryChainIds.map(
      (chainId: number) =>
        new OnChainRegistry({
          address: DEFAULT_REGISTRY_ADDRESS,
          provider: viem.createPublicClient({
            chain: findChain(chainId) as viem.Chain,
            transport: viem.http(),
          }),
        })
    );

    // Create a regsitry that loads data first from Memory to be able to utilize
    // the locally built data
    const fallbackRegistry = new FallbackRegistry([inMemoryRegistry, ...onChainRegistries]);
    return fallbackRegistry;
  }, []);
}

type Publishers = {
  publisher: viem.Address;
  chainName: string;
};

export function useCannonPackagePublishers(packageName: string) {
  const [publishers, setPublishers] = useState<Publishers[]>([]);

  useEffect(() => {
    const registryChainIds = DEFAULT_REGISTRY_CONFIG.map((registry) => registry.chainId);

    const onChainRegistries = registryChainIds.map(
      (chainId: number) =>
        new OnChainRegistry({
          address: DEFAULT_REGISTRY_ADDRESS,
          provider: viem.createPublicClient({
            chain: findChain(chainId) as viem.Chain,
            transport: viem.http(),
          }),
        })
    );

    const fetchPublishers = async () => {
      const [optimismRegistry, mainnetRegistry] = onChainRegistries;

      // note: optimism owner can't publish packages
      const [mainnetOwner, mainnetPublishers, optimismPublishers] = await Promise.all([
        mainnetRegistry.getPackageOwner(packageName),
        mainnetRegistry.getAdditionalPublishers(packageName),
        optimismRegistry.getAdditionalPublishers(packageName),
      ]);

      const publishers = [
        { publisher: mainnetOwner, chainName: 'Ethereum' },
        ...mainnetPublishers.map((publisher) => ({ publisher, chainName: 'Ethereum' })),
        ...optimismPublishers.map((publisher) => ({ publisher, chainName: 'Optimism' })),
      ];

      setPublishers(publishers);
    };

    void fetchPublishers();
  }, [packageName]);

  return publishers;
}
