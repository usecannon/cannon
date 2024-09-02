import Debug from 'debug';
import { Address } from 'viem';

const debug = Debug('cannon:builder:constants');

export const CANNON_CHAIN_ID = 13370;
export const BUILD_VERSION = 7;

// Production settings (OP Mainnet & ETH Mainnet)
export const DEFAULT_REGISTRY_ADDRESS: Address = '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba';

// the below RPC configuration is our public infura, but it only allows for requests against the cannon registry contract
export const DEFAULT_REGISTRY_CONFIG = [
  {
    name: 'OP Mainnet',
    chainId: 10,
    rpcUrl: ['frame', 'direct', 'https://opt-mainnet.g.alchemy.com/v2/iViPnjLzHhXkXS6Aj44qYDMqENOe0M_B'],
    address: DEFAULT_REGISTRY_ADDRESS,
  },
  {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: ['frame', 'direct', 'https://eth-mainnet.g.alchemy.com/v2/iViPnjLzHhXkXS6Aj44qYDMqENOe0M_B'],
    address: DEFAULT_REGISTRY_ADDRESS,
  },
];

/*
// Development settings (OP Sepolia & ETH Sepolia)
export const DEFAULT_REGISTRY_ADDRESS: Address = '0xEd58414AFA6706d2E19e009C635cC75D25A91f18';
export const DEFAULT_REGISTRY_CONFIG = [
  {
    name: 'OP Sepolia',
    chainId: 11155420,
    rpcUrl: ['frame', 'direct', 'https://optimism-sepolia-rpc.publicnode.com'],
    address: DEFAULT_REGISTRY_ADDRESS,
  },
  {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcUrl: ['frame', 'direct', 'https://ethereum-sepolia-rpc.publicnode.com'],
    address: DEFAULT_REGISTRY_ADDRESS,
  },
];
*/

export function getCannonRepoRegistryUrl() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // to avoid DST issues we choose a time in the middle of the winter (obviousy this doesn't work for southern tzs but those arent relevant anyway)
  const shHistoricalOffset = new Date('2023-01-01').getTimezoneOffset();

  debug(`timezone for repo resolve is ${tz}`);

  let region = 'us-east';
  if (tz?.startsWith('Asia/')) {
    region = 'sg';
  } else if (tz?.startsWith('Australia/')) {
    region = 'au-east';
  } else if (shHistoricalOffset >= 360) {
    // there are a lot of america timezones, so we just check if its mountain time or later
    region = 'us-west';
  }

  debug('cannon repo region is ', region);

  return `https+ipfs://${region}.repo.usecannon.com`;
}
