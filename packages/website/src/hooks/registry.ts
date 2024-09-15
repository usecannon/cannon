import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { DEFAULT_REGISTRY_ADDRESS, DEFAULT_REGISTRY_CONFIG, OnChainRegistry } from '@usecannon/builder';
import { useEffect, useState } from 'react';
import * as viem from 'viem';

type Publishers = {
  publisher: viem.Address;
  chainName: string;
  chainId: number;
};

export function useCannonPackagePublishers(packageName?: string) {
  const [publishers, setPublishers] = useState<Publishers[]>([]);
  const { getChainById } = useCannonChains();

  useEffect(() => {
    if (!packageName) return setPublishers([]);

    const onChainRegistries = DEFAULT_REGISTRY_CONFIG.map((config) => {
      return new OnChainRegistry({
        address: DEFAULT_REGISTRY_ADDRESS,
        provider: viem.createPublicClient({
          chain: getChainById(config.chainId),
          transport: viem.http(),
        }) as any, // TODO: fix type
      });
    });

    const fetchPublishers = async () => {
      const [optimismRegistry, mainnetRegistry] = onChainRegistries;

      // note: optimism owner can't publish packages
      const [mainnetOwner, mainnetPublishers, optimismPublishers] = await Promise.all([
        mainnetRegistry.getPackageOwner(packageName),
        mainnetRegistry.getAdditionalPublishers(packageName),
        optimismRegistry.getAdditionalPublishers(packageName),
      ]);

      const publishers = [
        ...mainnetPublishers.map((publisher) => ({ publisher, chainName: 'Ethereum', chainId: 1 })),
        ...optimismPublishers.map((publisher) => ({ publisher, chainName: 'Optimism', chainId: 10 })),
      ];

      // Owner on Ethereum can also publish
      if (!publishers.some((p) => p.publisher === mainnetOwner && p.chainId === 1)) {
        publishers.unshift({ publisher: mainnetOwner, chainName: 'Ethereum', chainId: 1 });
      }

      setPublishers(publishers);
    };

    void fetchPublishers();
  }, [packageName]);

  return publishers;
}
