import path from 'node:path';
import os from 'node:os';
export const DEFAULT_CANNON_DIRECTORY = path.join(os.homedir(), '.local', 'share', 'cannon');
export const DEFAULT_REGISTRY_IPFS_ENDPOINT = 'https://usecannon.infura-ipfs.io';
export const DEFAULT_REGISTRY_ENDPOINT = 'https://cloudflare-eth.com/v1/mainnet';
export const DEFAULT_REGISTRY_ADDRESS = '0xA98BE35415Dd28458DA4c1C034056766cbcaf642';
