import { CustomSpinner } from '@/components/CustomSpinner';
import { useStore } from '@/helpers/store';
import React, { createContext, PropsWithChildren, useContext } from 'react';
import { Chain, createPublicClient, http, HttpTransport } from 'viem';
import * as chains from '@wagmi/core/chains';
import { useQuery } from '@tanstack/react-query';
import merge from 'lodash/merge';

type CustomProviders =
  | {
      chains: Chain[];
      transports: Record<number, HttpTransport>;
    }
  | undefined;
const ProvidersContext = createContext<CustomProviders>(undefined);

const cannonNetwork = {
  ...chains.localhost,
  id: 13370,
  name: 'Cannon Localhost',
} as Chain;

export const supportedChains = [cannonNetwork, ...Object.values(chains)];

export const defaultTransports = supportedChains.reduce((transports, chain) => {
  transports[chain.id] = http();
  return transports;
}, {} as Record<number, HttpTransport>);

async function getProvidersChainId({ queryKey }: { queryKey: string[] }) {
  const [, ...providerUrls] = queryKey;
  const allPromises = providerUrls.map(async (rpcUrl) => {
    const client = createPublicClient({
      transport: http(rpcUrl),
    });
    const chainId = await client.getChainId();

    return {
      rpcUrl,
      chainId,
    };
  });

  const responses = await Promise.allSettled(allPromises);
  return responses.reduce((transports, r) => {
    if (r.status === 'fulfilled') {
      transports[+r.value.chainId] = r.value.rpcUrl;
    }

    return transports;
  }, {} as Record<number, string>);
}

function getAllChains(verifiedProviders?: Record<number, string>) {
  const customTransportsChains: Chain[] = [];

  if (!verifiedProviders) {
    return supportedChains;
  }

  Object.keys(verifiedProviders).forEach((ctId) => {
    const chain = supportedChains.find((c) => c.id === +ctId);
    if (!chain) {
      customTransportsChains.push({
        id: +ctId,
        name: 'Custom Chain',
        nativeCurrency: {
          name: 'Custom Chain',
          symbol: 'Custom',
          decimals: 18,
        },
        rpcUrls: {
          default: { http: [''] },
        },
      });
    }
  });

  return [...supportedChains, ...customTransportsChains];
}

function getAllTransports(verifiedProviders?: Record<number, string>) {
  if (!verifiedProviders) {
    return defaultTransports;
  }

  const verifiedTransports = Object.keys(verifiedProviders || {}).reduce(
    (prev, curr) => {
      prev[+curr] = http(verifiedProviders?.[+curr]);
      return prev;
    },
    {} as Record<number, HttpTransport>
  );

  return merge(defaultTransports, verifiedTransports);
}

export const CustomProvidersProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const customProviders = useStore((state) => state.settings.customProviders);

  const { isLoading, data: verifiedProviders } = useQuery({
    queryKey: ['fetchCustomProviders', ...customProviders],
    queryFn: getProvidersChainId,
  });

  const value = {
    chains: getAllChains(verifiedProviders),
    transports: getAllTransports(verifiedProviders),
  };

  return (
    <ProvidersContext.Provider value={value}>
      {isLoading ? <CustomSpinner m="auto" /> : children}
    </ProvidersContext.Provider>
  );
};

export const useProviders = () => {
  const context = useContext(ProvidersContext);
  if (context === undefined) {
    throw new Error(
      'useProviders must be used within a CustomProvidersProvider'
    );
  }
  return context;
};
