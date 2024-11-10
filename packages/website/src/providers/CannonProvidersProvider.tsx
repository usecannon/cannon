'use client';

import { CustomSpinner } from '@/components/CustomSpinner';
import { useStore } from '@/helpers/store';
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from 'react';
import * as viem from 'viem';
// eslint-disable-next-line no-restricted-imports
import * as chains from 'viem/chains';
import sortBy from 'lodash/sortBy';

import { externalLinks } from '@/constants/externalLinks';
import isEmpty from 'lodash/isEmpty';
import cloneDeep from 'lodash/cloneDeep';
import { useQuery } from '@tanstack/react-query';

type CustomProviders =
  | {
      chains: viem.Chain[];
      chainMetadata: Record<
        number,
        { color?: string; shortName?: string; serviceUrl?: string }
      >;
      transports: Record<number, viem.HttpTransport>;
      customTransports: Record<number, viem.HttpTransport>;
      getChainById: (chainId: number) => viem.Chain | undefined;
      getExplorerUrl: (chainId: number, hash: viem.Hash) => string;
    }
  | undefined;
const ProvidersContext = createContext<CustomProviders>(undefined);

const cannonNetwork = {
  ...chains.localhost,
  id: 13370,
  name: 'Cannon',
} as viem.Chain;

// Service urls taken from https://docs.safe.global/learn/safe-core/safe-core-api/available-services
// shortNames taken from https://github.com/ethereum-lists/chains/blob/master/_data/chains
// export const chains = [

export const chainMetadata = {
  [chains.arbitrum.id]: {
    color: '#96bedc',
    shortName: 'arb1',
    serviceUrl: 'https://safe-transaction-arbitrum.safe.global',
  },
  [chains.avalanche.id]: {
    color: '#e84141',
    shortName: 'avax',
    serviceUrl: 'https://safe-transaction-avalanche.safe.global',
  },
  [chains.base.id]: {
    color: '#0052ff',
    shortName: 'base',
    serviceUrl: 'https://safe-transaction-base.safe.global',
  },
  [chains.bsc.id]: {
    color: '#ebac0e',
    shortName: 'bnb',
    serviceUrl: 'https://safe-transaction-bsc.safe.global',
  },
  [chains.cronos.id]: {
    color: '#002D74',
  },
  [chains.mainnet.id]: {
    color: '#37367b',
    shortName: 'eth',
    serviceUrl: 'https://safe-transaction-mainnet.safe.global',
  },
  [chains.hardhat.id]: {
    color: '#f9f7ec',
  },
  [chains.optimism.id]: {
    color: '#ff5a57',
    shortName: 'oeth',
    serviceUrl: 'https://safe-transaction-optimism.safe.global',
  },
  [chains.polygon.id]: {
    color: '#9f71ec',
    shortName: 'matic',
    serviceUrl: 'https://safe-transaction-polygon.safe.global',
  },
  [chains.polygonZkEvm.id]: {
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
    shortName: 'gno',
    serviceUrl: 'https://safe-transaction-gnosis-chain.safe.global',
  },
  [chains.sepolia.id]: {
    shortName: 'sepolia',
    serviceUrl: 'https://safe-transaction-sepolia.safe.global',
  },
  [chains.reyaNetwork.id]: {
    color: '#04f06a',
    shortName: 'reyaNetwork',
    serviceUrl: 'https://transaction.safe.reya.network',
  },
  [chains.aurora.id]: {
    shortName: 'aurora',
    serviceUrl: 'https://safe-transaction-aurora.safe.global',
  },
  [chains.snax.id]: {
    color: '#00D1FF',
  },
  [cannonNetwork.id]: {
    color: 'gray.400',
  },
  [chains.blast.id]: {
    color: '#FCFC06',
  },
  [chains.celo.id]: {
    color: '#fdff52',
  },
} as const;

export const supportedChains = [cannonNetwork, ...Object.values(chains)];

export const defaultTransports = supportedChains.reduce((transports, chain) => {
  transports[chain.id] = viem.http();
  return transports;
}, {} as Record<number, viem.HttpTransport>);

type RpcUrlAndTransport = { rpcUrl: string; transport: viem.HttpTransport };

async function _getProvidersChainId({ queryKey }: { queryKey: string[] }) {
  const [, ...providerUrls] = queryKey;

  if (!providerUrls.length) {
    return {};
  }

  const allPromises = providerUrls.map(async (rpcUrl) => {
    const client = viem.createPublicClient({
      transport: viem.http(rpcUrl),
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
        transport: viem.http(r.value.rpcUrl),
      };
    }

    return transports;
  }, {} as Record<number, RpcUrlAndTransport>);
}

function _getAllChains(verifiedProviders?: Record<number, RpcUrlAndTransport>) {
  const customChains: viem.Chain[] = cloneDeep(supportedChains);

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

function _getCustomTransports(
  verifiedProviders?: Record<number, RpcUrlAndTransport>
) {
  const customTransports: { [chainId: number]: viem.HttpTransport } = {};

  for (const [chainId, provider] of Object.entries(verifiedProviders || {})) {
    customTransports[+chainId] = provider.transport;
  }

  return customTransports;
}

function _getChainById(allChains: viem.Chain[], chainId: number) {
  const chain = allChains.find((c) => c.id === +chainId);
  return chain;
}

const _getExplorerUrl = (
  allChains: viem.Chain[],
  chainId: number,
  hash: viem.Hash
) => {
  const chain = _getChainById(allChains, +chainId);
  if (!chain) return externalLinks.ETHERSCAN;

  const explorer = chain.blockExplorers?.default;
  if (!chain || !explorer) return '';

  const url = explorer?.url || externalLinks.ETHERSCAN;

  const type = viem.isAddress(hash) ? 'address' : 'tx';
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
  const [_allChains, _allTransports, _customTransports] = useMemo(
    () => [
      _getAllChains(verifiedProviders),
      _getAllTransports(verifiedProviders),
      _getCustomTransports(verifiedProviders),
    ],
    [JSON.stringify(sortBy(chainsUrls))]
  );

  return (
    <ProvidersContext.Provider
      value={{
        chains: _allChains,
        chainMetadata,
        transports: _allTransports,
        customTransports: _customTransports,
        getChainById: (chainId: number) => _getChainById(_allChains, chainId),
        getExplorerUrl: (chainId: number, hash: viem.Hash) =>
          _getExplorerUrl(_allChains, chainId, hash),
      }}
    >
      {isLoading ? <CustomSpinner /> : children}
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
