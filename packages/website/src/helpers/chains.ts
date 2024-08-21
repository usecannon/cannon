import { merge } from 'lodash';
import * as chains from 'viem/chains';
import * as viem from 'viem';
import find from 'lodash/find';

// For enrichment if necessary
//import { set } from 'lodash';
//set(chains, 'baseSepolia.blockExplorers.default.url', 'https://sepolia.basescan.org');

const metadata = {
  arbitrum: {
    color: '#96bedc',
  },
  avalanche: {
    color: '#e84141',
  },
  base: {
    color: '#0052ff',
  },
  bsc: {
    color: '#ebac0e',
  },
  cronos: {
    color: '#002D74',
  },
  mainnet: {
    color: '#37367b',
  },
  hardhat: {
    color: '#f9f7ec',
  },
  optimism: {
    color: '#ff5a57',
  },
  polygon: {
    color: '#9f71ec',
  },
  zora: {
    color: '#000000',
  },
  scroll: {
    color: '#ffeeda',
  },
  gnosis: {
    color: '#3e6957',
  },
  reyaNetwork: {
    color: '#04f06a',
  },
};

type ChainData = {
  id: number;
  name: string;
  color?: string;
  [key: string]: any; // This allows for additional properties without having to specify each one.
};

const newChain = {
  id: 13370,
  name: 'Cannon',
  color: 'gray.400',
};

const enrichedChainData: Record<string, ChainData> = {
  ...merge(chains, metadata),
  cannon: newChain,
};

const chainsById = Object.values(enrichedChainData).reduce((acc, chain) => {
  acc[chain.id] = chain;
  return acc;
});

export const getChainById = (chainId: number) => {
  const chain = find(chains, (chain: ChainData) => chain.id === Number(chainId));

  if (!chain) {
    return {
      id: chainId,
      name: 'Unknown Chain',
      color: 'gray.600',
    } as ChainData;
  }

  return chain;
};

export const getExplorerUrl = (chainId: number, hash: string) => {
  const chain = chainsById[chainId];
  const explorer = chain.blockExplorers?.default;
  if (!chain || !explorer) return '';

  const url = explorer?.url || 'https://etherscan.io';

  const type = viem.isAddress(hash) ? 'address' : 'tx';
  return `${url}/${type}/${hash}`;
};

export { chainsById };

export * from 'viem/chains';
export default chains;
