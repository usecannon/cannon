import path from 'node:path';
import os from 'node:os';

export const DEFAULT_CANNON_DIRECTORY = path.join(os.homedir(), '.local', 'share', 'cannon');
export const DEFAULT_REGISTRY_IPFS_ENDPOINT = 'https://ipfs.io';
export const DEFAULT_REGISTRY_ENDPOINT = 'https://cloudflare-eth.com/v1/mainnet';
export const DEFAULT_ETHERSCAN_API_URL = '';
export const DEFAULT_REGISTRY_ADDRESS = '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba';
export const CLI_SETTINGS_STORE = 'settings.json';
