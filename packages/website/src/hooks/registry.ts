import { findChain } from '@/helpers/rpc';
import { DEFAULT_REGISTRY_ADDRESS, DEFAULT_REGISTRY_CONFIG, OnChainRegistry } from '@usecannon/builder';
import { useEffect, useState } from 'react';
import * as viem from 'viem';

type Publishers = {
  publisher: viem.Address;
  chainName: string;
  chainId: number;
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
          }) as any, // TODO: fix type
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
        { publisher: mainnetOwner, chainName: 'Ethereum', chainId: 1 },
        ...mainnetPublishers.map((publisher) => ({ publisher, chainName: 'Ethereum', chainId: 1 })),
        ...optimismPublishers.map((publisher) => ({ publisher, chainName: 'Optimism', chainId: 10 })),
      ];

      setPublishers(publishers);
    };

    void fetchPublishers();
  }, [packageName]);

  return publishers;
}
