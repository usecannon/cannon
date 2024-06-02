import os from 'os';
import path from 'path';
import * as viem from 'viem';

export const ANVIL_FIRST_ADDRESS: viem.Address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
export const DEFAULT_CANNON_DIRECTORY = path.join(os.homedir(), '.local', 'share', 'cannon');
export const DEFAULT_ETHERSCAN_API_URL = '';

export const CLI_SETTINGS_STORE = 'settings.json';
