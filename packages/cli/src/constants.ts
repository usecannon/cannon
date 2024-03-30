import path from 'node:path';
import os from 'node:os';

import type { Address } from 'viem';

export const DEFAULT_CANNON_DIRECTORY = path.join(os.homedir(), '.local', 'share', 'cannon');
export const DEFAULT_ETHERSCAN_API_URL = '';
export const DEFAULT_REGISTRY_ADDRESS: Address = '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba';
export const DEFAULT_REGISTRY_CONFIG = [
  {
    chainId: 1,
    providerUrl: ['https://ethereum-rpc.publicnode.com'],
    address: DEFAULT_REGISTRY_ADDRESS,
  },
  {
    chainId: 10,
    providerUrl: ['https://optimism-rpc.publicnode.com'],
    address: DEFAULT_REGISTRY_ADDRESS,
  },
];
export const CLI_SETTINGS_STORE = 'settings.json';
