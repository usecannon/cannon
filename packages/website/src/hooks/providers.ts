import * as viem from 'viem';
import { http } from '@wagmi/core';
import { useState, useEffect } from 'react';
import * as chains from '@wagmi/core/chains';

import { useStore } from '@/helpers/store';

interface VerifiedProviders {
  provider: string;
  chainId: number;
}

const cannonNetwork: viem.Chain = {
  ...chains.localhost,
  id: 13370,
  name: 'Cannon Localhost',
};

export const supportedChains = [cannonNetwork, ...Object.values(chains)] as [viem.Chain, ...viem.Chain[]];

export const defaultTransports = supportedChains.reduce((prev, curr) => {
  prev[curr.id] = http();
  return prev;
}, {} as Record<number, viem.HttpTransport>);

export function useProviders() {
  const [verifiedProviders, setVerifiedProviders] = useState<VerifiedProviders[]>([]);
  const [transports, setTransports] = useState<Record<number, viem.HttpTransport>>(defaultTransports);
  const customProviders = useStore((state) => state.settings.customProviders);

  useEffect(() => {
    if (!customProviders.length) {
      setVerifiedProviders([]);
      return;
    }

    async function fetchVerifiedProviders() {
      const responses = await Promise.allSettled(
        customProviders.map(async (providerUrl) => {
          const publicClient = viem.createPublicClient({
            transport: http(providerUrl),
          });
          return {
            providerUrl,
            chainId: await publicClient.getChainId(),
          };
        })
      );

      const verified = responses.reduce((prev, curr) => {
        if (curr.status === 'fulfilled') {
          prev.push({
            provider: curr.value.providerUrl as string,
            chainId: Number(curr.value.chainId),
          });
        }

        return prev;
      }, [] as VerifiedProviders[]);

      setVerifiedProviders(verified);
    }

    void fetchVerifiedProviders();
  }, [customProviders]);

  useEffect(() => {
    const _transports = verifiedProviders.reduce((prev, curr) => {
      prev[curr.chainId] = http(curr.provider);

      return prev;
    }, transports);

    setTransports(_transports);
  }, [verifiedProviders]);

  return { verifiedProviders, transports };
}
