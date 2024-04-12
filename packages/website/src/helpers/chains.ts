import { merge } from 'lodash';
import * as chains from 'viem/chains';

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

export { chainsById };

export * from 'viem/chains';
export default chains;
