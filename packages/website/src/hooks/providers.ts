import { useStore } from '@/helpers/store';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from '@wagmi/core';
import * as chains from '@wagmi/core/chains';
import { useEffect, useState } from 'react';
import * as viem from 'viem';
import { WagmiProviderProps } from 'wagmi';
import { getE2eWagmiConfig } from '../../cypress/utils/wagmi-mock-config';

interface VerifiedProviders {
  provider: string;
  chainId: number;
}

const cannonNetwork = {
  ...chains.localhost,
  id: 13370,
  name: 'Cannon Localhost',
} as viem.Chain;

export const supportedChains = [cannonNetwork, ...Object.values(chains)] as [viem.Chain, ...viem.Chain[]];

export const defaultTransports = supportedChains.reduce((prev, curr) => {
  prev[curr.id] = http() as any; // TODO: fix type
  return prev;
}, {} as Record<number, viem.HttpTransport>);

const isE2ETest = process.env.NEXT_PUBLIC_E2E_TESTING_MODE === 'true';

export function useProviders() {
  const [wagmiConfig, setWagmiConfig] = useState<WagmiProviderProps['config'] | null>(null);

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
            transport: http(providerUrl) as any, // TODO: fix type
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
      prev[curr.chainId] = http(curr.provider) as any; // TODO: fix type

      return prev;
    }, transports);

    setTransports(_transports);
  }, [verifiedProviders]);

  useEffect(() => {
    // If we are running an E2E test, use the E2E config
    if (isE2ETest) {
      const e2eWagmiConfig = getE2eWagmiConfig();
      setWagmiConfig(e2eWagmiConfig);
      return;
    }
    setWagmiConfig(
      getDefaultConfig({
        appName: 'Cannon',
        projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
        chains: [...supportedChains] as any, // TODO: fix type
        transports: transports as any, // TODO: fix type
      })
    );
  }, [transports]);

  return { verifiedProviders, transports, wagmiConfig };
}
