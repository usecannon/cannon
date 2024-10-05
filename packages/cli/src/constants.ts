import os from 'os';
import path from 'path';
import * as viem from 'viem';

// Ref: https://www.lifewire.com/port-0-in-tcp-and-udp-818145
export const ANVIL_PORT_DEFAULT_VALUE = '0'; // Port 0 means it will choose a random port
export const ANVIL_FIRST_ADDRESS: viem.Address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
export const DEFAULT_CANNON_DIRECTORY = path.join(os.homedir(), '.local', 'share', 'cannon');
export const DEFAULT_ETHERSCAN_API_URL = '';
export const CLI_SETTINGS_STORE = 'settings.json';
