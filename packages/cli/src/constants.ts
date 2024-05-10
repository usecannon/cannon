import os from 'os';
import path from 'path';

import type { Address } from 'viem';

export const ANVIL_FIRST_ADDRESS: Address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
export const DEFAULT_CANNON_DIRECTORY = path.join(os.homedir(), '.local', 'share', 'cannon');
export const DEFAULT_ETHERSCAN_API_URL = '';

// Production settings (ETH Mainnet & OP Mainnet)
export const DEFAULT_REGISTRY_ADDRESS: Address = '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba';
export const DEFAULT_REGISTRY_CONFIG = [
  // OP Mainnet
  {
    chainId: 10,
    providerUrl: ['https://optimism-rpc.publicnode.com'],
    address: DEFAULT_REGISTRY_ADDRESS,
  },
  // Ethereum Mainnet
  {
    chainId: 1,
    providerUrl: ['https://ethereum-rpc.publicnode.com'],
    address: DEFAULT_REGISTRY_ADDRESS,
  },
];

/*
// Development settings (ETH Sepolia & OP Sepolia)
export const DEFAULT_REGISTRY_ADDRESS: Address = '0xEd58414AFA6706d2E19e009C635cC75D25A91f18';
export const DEFAULT_REGISTRY_CONFIG = [
  // Ethereum Sepolia
  {
    chainId: 11155111,
    providerUrl: ['https://ethereum-sepolia-rpc.publicnode.com'],
    address: DEFAULT_REGISTRY_ADDRESS,
  },
  // OP Sepolia
  {
    chainId: 11155420,
    providerUrl: ['https://optimism-sepolia-rpc.publicnode.com'],
    address: DEFAULT_REGISTRY_ADDRESS,
  },
];
*/

export const CLI_SETTINGS_STORE = 'settings.json';
