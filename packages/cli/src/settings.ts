import Debug from 'debug';
import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import untildify from 'untildify';
import * as viem from 'viem';
import { parseEnv } from 'znv';
import { z } from 'zod';
import { CLI_SETTINGS_STORE, DEFAULT_CANNON_DIRECTORY, DEFAULT_REGISTRY_CONFIG } from './constants';
import { filterSettings } from './helpers';

const debug = Debug('cannon:cli:settings');

/**
 * Local User Settings for CLI context
 */
export type CliSettings = {
  /**
   * provider used for `build` defaults to 'frame,direct' https://github.com/floating/eth-provider#presets
   */
  providerUrl: string;

  /**
   * private key(s) of default signer that should be used for build, comma separated
   */
  privateKey?: viem.Hash;

  /**
   * The amount of times ipfs should retry requests (applies to read and write)
   */
  ipfsRetries?: number;

  /**
   * the url of the IPFS endpoint to use as a storage base. defaults to localhost IPFS
   */
  ipfsUrl?: string;

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
    chainId: number;
    providerUrl: string[];
    address: viem.Address;
  }[];

  /**
   * Which registry to read from first. Defaults to `onchain`
   */
  registryPriority: 'local' | 'onchain';

  /**
   * Directory to load configurations from and for local registry
   */
  cannonDirectory: string;

  /**
   * Settings file to load configurations from
   */
  cannonSettings?: string;

  /**
   * URL of etherscan API for verification
   */
  etherscanApiUrl?: string;

  /**
   * Etherscan API Key for verification
   */
  etherscanApiKey: string;

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

/**
 * Settings zod schema.
 * Check env vars and set default values if needed
 */

function cannonSettingsSchema(fileSettings: Omit<CliSettings, 'cannonDirectory'>) {
  return {
    CANNON_DIRECTORY: z.string().default(DEFAULT_CANNON_DIRECTORY),
    CANNON_SETTINGS: z.string().optional(),
    CANNON_PROVIDER_URL: z.string().default(fileSettings.providerUrl || 'frame,direct'),
    CANNON_PRIVATE_KEY: z
      .string()
      .refine((val) => viem.isHash(val), { message: 'Private key is invalid' })
      .optional()
      .default(fileSettings.privateKey as string),
    CANNON_IPFS_RETRIES: z.number().optional().default(3),
    CANNON_IPFS_URL: z
      .string()
      .url()
      .optional()
      .default(fileSettings.ipfsUrl as string),
    CANNON_PUBLISH_IPFS_URL: z
      .string()
      .url()
      .optional()
      .default(fileSettings.publishIpfsUrl as string),
    CANNON_REGISTRY_PROVIDER_URL: z.string().optional(),
    CANNON_REGISTRY_CHAIN_ID: z.string().optional(),
    CANNON_REGISTRY_ADDRESS: z
      .string()
      .optional()
      .refine((v) => !v || viem.isAddress(v), 'must be address'),
    CANNON_REGISTRY_PRIORITY: z.enum(['onchain', 'local']).default(fileSettings.registryPriority || 'onchain'),
    CANNON_ETHERSCAN_API_URL: z
      .string()
      .url()
      .optional()
      .default(fileSettings.etherscanApiUrl as string),
    CANNON_ETHERSCAN_API_KEY: z.string().length(34).optional().default(fileSettings.etherscanApiKey),
    CANNON_QUIET: z.boolean().default(fileSettings.quiet || false),
    TRACE: z.boolean().default(false),
  };
}

// TODO: this function is ugly
function _resolveCliSettings(overrides: Partial<CliSettings> = {}): CliSettings {
  const cliSettingsStore = untildify(
    path.join(process.env.CANNON_DIRECTORY || DEFAULT_CANNON_DIRECTORY, CLI_SETTINGS_STORE)
  );

  let fileSettings: Omit<CliSettings, 'cannonDirectory'>;
  if (process.env.CANNON_SETTINGS) {
    fileSettings = JSON.parse(process.env.CANNON_SETTINGS);
  } else {
    fileSettings = fs.existsSync(cliSettingsStore) ? fs.readJsonSync(cliSettingsStore) : {};
  }

  const {
    CANNON_DIRECTORY,
    CANNON_SETTINGS,
    CANNON_PROVIDER_URL,
    CANNON_PRIVATE_KEY,
    CANNON_IPFS_RETRIES,
    CANNON_IPFS_URL,
    CANNON_PUBLISH_IPFS_URL,
    CANNON_REGISTRY_PROVIDER_URL,
    CANNON_REGISTRY_CHAIN_ID,
    CANNON_REGISTRY_ADDRESS,
    CANNON_REGISTRY_PRIORITY,
    CANNON_ETHERSCAN_API_URL,
    CANNON_ETHERSCAN_API_KEY,
    CANNON_QUIET,
    TRACE,
  } = parseEnv(process.env, cannonSettingsSchema(fileSettings));

  const finalSettings = _.assign(
    {
      cannonDirectory: untildify(CANNON_DIRECTORY),
      cannonSettings: CANNON_SETTINGS,
      providerUrl: CANNON_PROVIDER_URL,
      privateKey: CANNON_PRIVATE_KEY,
      ipfsRetries: CANNON_IPFS_RETRIES,
      ipfsUrl: CANNON_IPFS_URL,
      publishIpfsUrl: CANNON_PUBLISH_IPFS_URL,
      registries: [],
      registryPriority: CANNON_REGISTRY_PRIORITY,
      etherscanApiUrl: CANNON_ETHERSCAN_API_URL,
      etherscanApiKey: CANNON_ETHERSCAN_API_KEY,
      quiet: CANNON_QUIET,
      trace: TRACE,
    },
    _.pickBy(overrides)
  ) as CliSettings;

  if (CANNON_REGISTRY_PROVIDER_URL && CANNON_REGISTRY_CHAIN_ID) {
    finalSettings.registries.push({
      providerUrl: [CANNON_REGISTRY_PROVIDER_URL],
      chainId: parseInt(CANNON_REGISTRY_CHAIN_ID),
      address: CANNON_REGISTRY_ADDRESS as viem.Address,
    });
  } else {
    finalSettings.registries = DEFAULT_REGISTRY_CONFIG;
  }

  debug('got settings', filterSettings(finalSettings));

  return finalSettings;
}

export const resolveCliSettings = _.memoize(_resolveCliSettings);
