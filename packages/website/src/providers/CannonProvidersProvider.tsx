'use client';

import { SafeTxService, useStore } from '@/helpers/store';
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from 'react';

// eslint-disable-next-line no-restricted-imports
import * as chains from 'viem/chains';
import sortBy from 'lodash/sortBy';
import merge from 'lodash/merge';

import { externalLinks } from '@/constants/externalLinks';
import isEmpty from 'lodash/isEmpty';
import cloneDeep from 'lodash/cloneDeep';
import { useQuery } from '@tanstack/react-query';
import PageLoading from '@/components/PageLoading';
import { isE2ETest } from '@/constants/misc';
import { randomItem } from '@/helpers/random';
import {
  Address,
  Chain,
  createPublicClient,
  defineChain,
  Hash,
  http,
  HttpTransport,
  isAddress,
} from 'viem';

export const polynomial = defineChain({
  id: 8008,
  name: 'Polynomial Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.polynomial.fi'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Polynomial Explorer',
      url: 'https://polynomialscan.io',
    },
  },
  testnet: false,
});

export type CustomChainMetadata = Record<
  number,
  {
    color?: string;
    shortName?: string;
    serviceUrl?: string;
  }
>;

export type CustomProviders =
  | {
      chains: Chain[];
      chainMetadata: CustomChainMetadata;
      transports: Record<number, HttpTransport>;
      customTransports: Record<number, HttpTransport>;
      otterscanApis: Record<number, RpcUrlAndTransport>;
      getChainById: (chainId: number) => Chain | undefined;
      getExplorerUrl: (
        chainId: number,
        hash: Hash | Address | `0x${string}`
      ) => string;
    }
  | undefined;
const ProvidersContext = createContext<CustomProviders>(undefined);

const cannonNetwork = {
  ...chains.localhost,
  id: 13370,
  name: 'Cannon',
} as Chain;

// Some chains have default rpc urls that don't work properly with interact on the website
// because they are being rate limited. We use custom rpc urls for these chains.
// we walso use the e2e provider urls if they are available
const customDefaultRpcs: Record<number, Chain['rpcUrls']> = {
  [`${chains.mainnet.id}`]: {
    default: {
      http: [
        isE2ETest
          ? process.env.NEXT_PUBLIC_CANNON_E2E_RPC_URL_ETHEREUM ||
            'https://please-configure'
          : randomItem([
              'https://eth.llamarpc.com',
              'https://ethereum-rpc.publicnode.com',
              'https://eth.blockrazor.xyz',
            ]),
      ],
    },
  },
  [`${chains.sepolia.id}`]: {
    default: {
      http: [
        isE2ETest
          ? process.env.NEXT_PUBLIC_CANNON_E2E_RPC_URL_SEPOLIA ||
            'https://please-configure'
          : randomItem([
              'https://gateway.tenderly.co/public/sepolia',
              'https://ethereum-sepolia-rpc.publicnode.com',
              'https://eth-sepolia.public.blastapi.io',
            ]),
      ],
    },
  },
};

// Service urls taken from https://docs.safe.global/learn/safe-core/safe-core-api/available-services
// shortNames taken from https://github.com/ethereum-lists/chains/blob/master/_data/chains
// export const chains = [

const chainMetadata = {
  [polynomial.id]: {
    color: '#cdfe40',
  },
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
  [chains.baseSepolia.id]: {
    color: '#0052ff',
    shortName: 'base',
    serviceUrl: 'https://safe-transaction-base-sepolia.safe.global',
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
    color: '#6600ff',
    shortName: 'matic',
    serviceUrl: 'https://safe-transaction-polygon.safe.global',
  },
  [chains.polygonZkEvm.id]: {
    color: '#5100b9',
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
    serviceUrl: 'https://safe.protofire.io',
  },
  [chains.celo.id]: {
    color: '#fdff52',
  },
  [chains.berachain.id]: {
    color: '#814625',
  },
  [chains.unichain.id]: {
    color: '#FF007A',
  },
  [chains.harmonyOne.id]: {
    color: '#00b5e7',
  },
  [chains.sonic.id]: {
    color: '#fe9a4d',
  },
} as const;

export const supportedChains = (
  [cannonNetwork, polynomial, ...Object.values(chains)] as Chain[]
).map((c) => {
  if (!customDefaultRpcs[`${c.id}`]) return c;

  return {
    ...c,
    rpcUrls: merge({}, c.rpcUrls, customDefaultRpcs[`${c.id}`]),
  };
});

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

function _getCustomTransports(
  verifiedProviders?: Record<number, RpcUrlAndTransport>
) {
  const customTransports: { [chainId: number]: HttpTransport } = {};

  for (const [chainId, provider] of Object.entries(verifiedProviders || {})) {
    customTransports[+chainId] = provider.transport;
  }

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

function _getMergedChainMetadata(safeTxServices: SafeTxService[]) {
  const customServiceUrls = safeTxServices.reduce(
    (acc, service) => ({
      ...acc,
      [service.chainId]: {
        ...chainMetadata[service.chainId],
        serviceUrl: service.url,
      },
    }),
    {}
  );

  return merge({}, chainMetadata, customServiceUrls);
}

export const CannonProvidersProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const customProviders = useStore((state) => state.settings.customProviders);
  const otterscanProviders = useStore((state) => state.settings.customOtterscanAPIs);
  const safeTxServices = useStore((state) => state.safeTxServices);

  const { isLoading: isLoadingProviders, data: verifiedProviders } = useQuery({
    queryKey: ['fetchCustomProviders', ...customProviders],
    queryFn: _getProvidersChainId,
  });

  const { isLoadingOtterscan, data: verifiedOtterscanProviders } = useQuery({
    queryKey: ['fetchCustomOtterscan', ...otterscanProviders],
    queryFn: _getProvidersChainId,
  });

  const chainsUrls = Object.values(verifiedProviders || {}).map(
    (v) => v.rpcUrl
  );

  const chainsUrlsString = JSON.stringify(sortBy(chainsUrls));

  const mergedChainMetadata = useMemo(
    () => _getMergedChainMetadata(safeTxServices),
    [safeTxServices]
  );

  const [_allChains, _allTransports, _customTransports] = useMemo(
    () => [
      _getAllChains(verifiedProviders),
      _getAllTransports(verifiedProviders),
      _getCustomTransports(verifiedProviders),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chainsUrlsString]
  );

  return (
    <ProvidersContext.Provider
      value={{
        chains: _allChains,
        chainMetadata: mergedChainMetadata,
        transports: _allTransports,
        customTransports: _customTransports,
        otterscanApis: verifiedOtterscanProviders,
        getChainById: (chainId) => _getChainById(_allChains, chainId),
        getExplorerUrl: (chainId, hash) =>
          _getExplorerUrl(_allChains, chainId, hash as Hash),
      }}
    >
      {isLoadingProviders || isLoadingOtterscan ? <PageLoading /> : children}
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
