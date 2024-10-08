'use client';

import { CustomSpinner } from '@/components/CustomSpinner';
import { useStore } from '@/helpers/store';
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from 'react';
import {
  Chain,
  Hash,
  http,
  HttpTransport,
  isAddress,
  createPublicClient,
} from 'viem';
// eslint-disable-next-line no-restricted-imports
import * as chains from 'viem/chains';
import sortBy from 'lodash/sortBy';

import { externalLinks } from '@/constants/externalLinks';
import isEmpty from 'lodash/isEmpty';
import cloneDeep from 'lodash/cloneDeep';
import { useQuery } from '@tanstack/react-query';

type CustomProviders =
  | {
      chains: Chain[];
      chainMetadata: Record<number, { color: string }>;
      transports: Record<number, HttpTransport>;
      getChainById: (chainId: number) => Chain | undefined;
      getExplorerUrl: (chainId: number, hash: Hash) => string;
    }
  | undefined;
const ProvidersContext = createContext<CustomProviders>(undefined);

const cannonNetwork = {
  ...chains.localhost,
  id: 13370,
  name: 'Cannon',
} as Chain;

const chainMetadata = {
  [chains.arbitrum.id]: {
    color: '#96bedc',
  },
  [chains.avalanche.id]: {
    color: '#e84141',
  },
  [chains.base.id]: {
    color: '#0052ff',
  },
  [chains.bsc.id]: {
    color: '#ebac0e',
  },
  [chains.cronos.id]: {
    color: '#002D74',
  },
  [chains.mainnet.id]: {
    color: '#37367b',
  },
  [chains.hardhat.id]: {
    color: '#f9f7ec',
  },
  [chains.optimism.id]: {
    color: '#ff5a57',
  },
  [chains.polygon.id]: {
    color: '#9f71ec',
  },
  [chains.zora.id]: {
    color: '#000000',
  },
  [chains.scroll.id]: {
    color: '#ffeeda',
  },
  [chains.gnosis.id]: {
    color: '#3e6957',
  },
  [chains.reyaNetwork.id]: {
    color: '#04f06a',
  },
  [chains.snax.id]: {
    color: '#00D1FF',
  },
  [cannonNetwork.id]: {
    color: 'gray.400',
  },
} as const;

export const supportedChains = [cannonNetwork, ...Object.values(chains)];

export const defaultTransports = supportedChains.reduce((transports, chain) => {
  transports[chain.id] = http();
  return transports;
}, {} as Record<number, HttpTransport>);

type RpcUrlAndTransport = { rpcUrl: string; transport: HttpTransport };

async function _getProvidersChainId({ queryKey }: { queryKey: string[] }) {
  const [, ...providerUrls] = queryKey;

  if (!providerUrls.length) {
    return {};
  }

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
      transports[+r.value.chainId] = {
        rpcUrl: r.value.rpcUrl,
        transport: http(r.value.rpcUrl),
      };
    }

    return transports;
  }, {} as Record<number, RpcUrlAndTransport>);
}

function _getAllChains(verifiedProviders?: Record<number, RpcUrlAndTransport>) {
  const customChains: Chain[] = cloneDeep(supportedChains);

  if (!verifiedProviders || isEmpty(verifiedProviders)) {
    return customChains;
  }

  Object.keys(verifiedProviders).forEach((ctId) => {
    const chain = customChains.find((c) => c.id === +ctId);

    if (!chain) {
      customChains.push({
        id: +ctId,
        name: 'Custom Chain',
        nativeCurrency: {
          name: 'Custom Chain',
          symbol: 'Custom',
          decimals: 18,
        },
        rpcUrls: {
          default: { http: [verifiedProviders[+ctId].rpcUrl] },
        },
      });
    } else {
      chain.rpcUrls = { default: { http: [verifiedProviders[+ctId].rpcUrl] } };
    }
  });

  return customChains;
}

function _getAllTransports(
  verifiedProviders?: Record<number, RpcUrlAndTransport>
) {
  const customTransports = cloneDeep(defaultTransports);

  if (!verifiedProviders || isEmpty(verifiedProviders)) {
    return customTransports;
  }

  Object.keys(verifiedProviders).forEach((chainId) => {
    customTransports[+chainId] = verifiedProviders?.[+chainId].transport;
  });

  return customTransports;
}

function _getChainById(allChains: Chain[], chainId: number) {
  const chain = allChains.find((c) => c.id === +chainId);
  return chain;
}

const _getExplorerUrl = (allChains: Chain[], chainId: number, hash: Hash) => {
  const chain = _getChainById(allChains, +chainId);
  if (!chain) return externalLinks.ETHERSCAN;

  const explorer = chain.blockExplorers?.default;
  if (!chain || !explorer) return '';

  const url = explorer?.url || externalLinks.ETHERSCAN;

  const type = isAddress(hash) ? 'address' : 'tx';
  return `${url}/${type}/${hash}`;
};

export const CannonProvidersProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const customProviders = useStore((state) => state.settings.customProviders);

  const { isLoading, data: verifiedProviders } = useQuery({
    queryKey: ['fetchCustomProviders', ...customProviders],
    queryFn: _getProvidersChainId,
  });

  const chainsUrls = Object.values(verifiedProviders || {}).map(
    (v) => v.rpcUrl
  );
  const [_allChains, _allTransports] = useMemo(
    () => [
      _getAllChains(verifiedProviders),
      _getAllTransports(verifiedProviders),
    ],
    [JSON.stringify(sortBy(chainsUrls))]
  );

  return (
    <ProvidersContext.Provider
      value={{
        chains: _allChains,
        chainMetadata,
        transports: _allTransports,
        getChainById: (chainId: number) => _getChainById(_allChains, chainId),
        getExplorerUrl: (chainId: number, hash: Hash) =>
          _getExplorerUrl(_allChains, chainId, hash),
      }}
    >
      {isLoading ? <CustomSpinner m="auto" /> : children}
    </ProvidersContext.Provider>
  );
};

export const useCannonChains = () => {
  const context = useContext(ProvidersContext);
  if (context === undefined) {
    throw new Error(
      'useCannonChains must be used within a CustomProvidersProvider'
    );
  }
  return context;
};
