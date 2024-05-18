// Service urls taken from https://docs.safe.global/learn/safe-core/safe-core-api/available-services
// shortNames taken from https://github.com/ethereum-lists/chains/blob/master/_data/chains
export const chains = [
  {
    id: 1,
    name: 'Ethereum Mainnet',
    shortName: 'eth',
    serviceUrl: 'https://safe-transaction-mainnet.safe.global',
  },
  {
    id: 10,
    name: 'Optimism',
    shortName: 'oeth',
    serviceUrl: 'https://safe-transaction-optimism.safe.global',
  },
  {
    id: 56,
    name: 'Binance Smart Chain',
    shortName: 'bnb',
    serviceUrl: 'https://safe-transaction-bsc.safe.global',
  },
  {
    id: 100,
    name: 'Gnosis Chain',
    shortName: 'gno',
    serviceUrl: 'https://safe-transaction-gnosis-chain.safe.global',
  },
  {
    id: 137,
    name: 'Polygon',
    shortName: 'matic',
    serviceUrl: 'https://safe-transaction-polygon.safe.global',
  },
  {
    id: 420,
    name: 'Optimism Goerli Testnet',
    shortName: 'ogor',
    serviceUrl: '',
  },
  {
    id: 8453,
    name: 'Base',
    shortName: 'base',
    serviceUrl: 'https://safe-transaction-base.safe.global',
  },
  {
    id: 42161,
    name: 'Arbitrum',
    shortName: 'arb1',
    serviceUrl: 'https://safe-transaction-arbitrum.safe.global',
  },
  {
    id: 43114,
    name: 'Avalanche',
    shortName: 'avax',
    serviceUrl: 'https://safe-transaction-avalanche.safe.global',
  },
  {
    id: 11155111,
    name: 'Sepolia',
    shortName: 'sepolia',
    serviceUrl: 'https://safe-transaction-sepolia.safe.global',
  },
  {
    id: 1313161554,
    name: 'Aurora',
    shortName: 'aurora',
    serviceUrl: 'https://safe-transaction-aurora.safe.global',
  },
  {
    id: 1729,
    name: 'Reya Network',
    shortName: 'reyaNetwork',
    serviceUrl: 'https://transaction.safe.reya.network',
  },
] as const;
