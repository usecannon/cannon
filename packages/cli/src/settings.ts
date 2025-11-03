import { DEFAULT_REGISTRY_CONFIG } from '@usecannon/builder';
import Debug from 'debug';
import fs from 'fs-extra';
import { assign, isEmpty, memoize, pickBy } from 'lodash-es';
import path from 'path';
import untildify from 'untildify';
import * as viem from 'viem';
import { CLI_SETTINGS_STORE, DEFAULT_CANNON_DIRECTORY } from './constants.js';
import { checkAndNormalizePrivateKey, filterSettings } from './helpers.js';
import { deprecatedWarn } from './util/deprecated-warn.js';

const debug = Debug('cannon:cli:settings');

/**
 * Local User Settings for CLI context
 */
export type CliSettings = {
  /**
   * (DEPRECATED) Provider used for `build` defaults to 'frame,direct' https://github.com/floating/eth-provider#presets
   */
  providerUrl?: string;

  /**
   * Provider used for `build` defaults to 'frame,direct' https://github.com/floating/eth-provider#presets
   */
  rpcUrl: string;

  /**
   * Private key(s) of default signer that should be used for build, comma separated
   */
  privateKey?: viem.Hex;

  /**
   * The amount of times axios should retry IPFS requests (applies to read and write)
   */
  ipfsRetries?: number;

  /**
   * The interval in seconds that axios should wait before timing out requests
   */
  ipfsTimeout?: number;

  /**

   * the url of the IPFS endpoint to use as a storage base, only for reading data
   */
  ipfsUrl?: string;

  /**
   * the url of the IPFS endpoint to use as a storage base, only for writing data
   */
  writeIpfsUrl?: string;

  /**
   * the IPFS url to use when publishing. If you have an IPFS cluster, or a pinning service, this is a good place to put its IPFS Proxy publish endpoint. If not specified, your packages wont be uploaded to remote ipfs.
   */
  publishIpfsUrl?: string;

  /**
   * List of registries that should be read from to find packages.
   * Earlier registries in the array get priority for resolved packages over later ones.
   * First registry on the list is the one that handles setPackageOwnership() calls to create packages.
   */
  registries: {
    chainId?: number;
    name: string;
    rpcUrl?: string[];
    address: viem.Address;
  }[];

  /**
   * URL to use to write a package to the registry.
   */
  registryRpcUrl?: string;

  /**
   * chain Id of the registry. Defaults to `1`.
   */
  registryChainId?: string;

  /**
   * Address of the registry.
   */
  registryAddress?: viem.Address;

  /**
   * Which registry to read from first. Defaults to `onchain`
   */
  registryPriority: 'local' | 'onchain' | 'offline';

  /**
   * Directory to load configurations from and for local registry
   */
  cannonDirectory: string;

  /**
   * URL of etherscan API for verification
   */
  etherscanApiUrl?: string;

  /**
   * Etherscan API Key for verification
   */
  etherscanApiKey: string;

  /**
   * Whether to run in E2E mode
   */
  isE2E: boolean;

  /**
   * Whether to suppress extra output
   */
  quiet: boolean;

  /**
   * Enable/disable tracing
   */
  trace: boolean;

  /**
   * Gas price to use for transactions
   */
  gasPrice?: string;

  /**
   * Base and Priority gas fee to use for transactions - EIP1559
   */
  gasFee?: string;
  priorityGasFee?: string;
};

export const DEFAULT_RPC_URL = 'frame,direct';
let cachedCliSettings: CliSettings | null = null;

/**
 * Helper to parse boolean environment variables
 */
function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const lowercased = value.toLowerCase();
  return lowercased === 'true' || lowercased === '1' || lowercased === 'yes';
}

/**
 * Helper to parse number environment variables
 */
function parseNumberEnv(value: string | undefined, defaultValue?: number): number | undefined {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function computeCliSettings(overrides: Partial<CliSettings> = {}): CliSettings {
  const settingsPath = untildify(path.join(process.env.CANNON_DIRECTORY || DEFAULT_CANNON_DIRECTORY, CLI_SETTINGS_STORE));

  let fileSettings: Partial<CliSettings>;
  if (process.env.CANNON_SETTINGS) {
    fileSettings = JSON.parse(process.env.CANNON_SETTINGS);
  } else {
    fileSettings = fs.existsSync(settingsPath) ? fs.readJsonSync(settingsPath) : {};
  }

  const finalSettings = assign(
    {
      cannonDirectory: process.env.CANNON_DIRECTORY || fileSettings.cannonDirectory || DEFAULT_CANNON_DIRECTORY,
      rpcUrl:
        process.env.CANNON_RPC_URL ||
        process.env.CANNON_PROVIDER_URL ||
        fileSettings.rpcUrl ||
        fileSettings.providerUrl ||
        DEFAULT_RPC_URL,
      privateKey: process.env.CANNON_PRIVATE_KEY || fileSettings.privateKey,
      ipfsTimeout: parseNumberEnv(process.env.CANNON_IPFS_TIMEOUT, fileSettings.ipfsTimeout || 300000),
      ipfsRetries: parseNumberEnv(process.env.CANNON_IPFS_RETRIES, fileSettings.ipfsRetries || 3),
      ipfsUrl: process.env.CANNON_IPFS_URL || fileSettings.ipfsUrl || '',
      writeIpfsUrl: process.env.CANNON_WRITE_IPFS_URL || fileSettings.writeIpfsUrl || '',
      publishIpfsUrl: process.env.CANNON_PUBLISH_IPFS_URL || fileSettings.publishIpfsUrl,
      registries:
        process.env.CANNON_REGISTRY_ADDRESS && (process.env.CANNON_REGISTRY_RPC_URL || process.env.CANNON_REGISTRY_CHAIN_ID)
          ? [
              {
                name: 'Custom Network',
                rpcUrl: process.env.CANNON_REGISTRY_RPC_URL ? [process.env.CANNON_REGISTRY_RPC_URL] : undefined,
                chainId: process.env.CANNON_REGISTRY_CHAIN_ID ? Number(process.env.CANNON_REGISTRY_CHAIN_ID) : undefined,
                address: process.env.CANNON_REGISTRY_ADDRESS as viem.Address,
              },
            ]
          : fileSettings.registries || DEFAULT_REGISTRY_CONFIG,
      registryPriority:
        (process.env.CANNON_REGISTRY_PRIORITY as 'onchain' | 'local' | 'offline') ||
        fileSettings.registryPriority ||
        'onchain',
      etherscanApiUrl: process.env.CANNON_ETHERSCAN_API_URL || fileSettings.etherscanApiUrl,
      etherscanApiKey: process.env.CANNON_ETHERSCAN_API_KEY || fileSettings.etherscanApiKey || '',
      quiet: parseBooleanEnv(process.env.CANNON_QUIET, fileSettings.quiet || false),
      isE2E: parseBooleanEnv(process.env.CANNON_E2E, false),
      trace: parseBooleanEnv(process.env.TRACE, false),
    },
    pickBy(overrides),
  ) as CliSettings;

  if (overrides.providerUrl && !overrides.rpcUrl) {
    deprecatedWarn('--provider-url', '--rpc-url');
    finalSettings.rpcUrl = overrides.providerUrl;
  }

  // check and normalize private keys
  finalSettings.privateKey = checkAndNormalizePrivateKey(finalSettings.privateKey);

  if (overrides.registryAddress && (overrides.registryRpcUrl || overrides.registryChainId)) {
    finalSettings.registries = [
      {
        name: 'Custom Network',
        rpcUrl: overrides.registryRpcUrl ? [overrides.registryRpcUrl] : undefined,
        chainId: overrides.registryChainId ? Number(overrides.registryChainId) : undefined,
        address: overrides.registryAddress ? overrides.registryAddress : (process.env.CANNON_REGISTRY_ADDRESS as viem.Address),
      },
    ];
  }

  debug('final settings:', filterSettings(finalSettings));

  return finalSettings;
}

const memoizedCliSettings = memoize((overrides: Partial<CliSettings> = {}): CliSettings => {
  const result = computeCliSettings(overrides);
  cachedCliSettings = result;
  return result;
});

export const getCliSettings = (overrides: Partial<CliSettings> = {}): CliSettings => {
  if (isEmpty(overrides) && cachedCliSettings) {
    return cachedCliSettings;
  }
  return memoizedCliSettings(overrides);
};

export const resolveCliSettings = getCliSettings;
export const resolveCliSettingsNoCache = computeCliSettings;
