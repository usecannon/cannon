import { inMemoryRegistry } from '@/helpers/cannon';
import { findChain } from '@/helpers/rpc';
import { FallbackRegistry, OnChainRegistry } from '@usecannon/builder';
import { DEFAULT_REGISTRY_ADDRESS, DEFAULT_REGISTRY_CONFIG } from '@usecannon/cli/dist/src/constants';
import { useEffect, useMemo, useState } from 'react';
import * as viem from 'viem';
import { mainnet } from 'viem/chains';

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

export function useCannonPackagePublishers(packageName: string) {
  const [publishers, setPublishers] = useState<viem.Address[]>([]);

  useEffect(() => {
    const registry = new OnChainRegistry({
      address: DEFAULT_REGISTRY_ADDRESS,
      provider: viem.createPublicClient({
        chain: mainnet,
        transport: viem.http(),
      }),
    });

    const fetchPublishers = async () => {
      const [owner, publishers] = await Promise.all([
        registry.getPackageOwner(packageName),
        registry.getAdditionalPublishers(packageName),
      ]);
      setPublishers([owner, ...publishers]);
    };

    void fetchPublishers();
  }, [packageName]);

  return publishers;
}
