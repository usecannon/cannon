import Debug from 'debug';
import { z } from 'zod';
import { parseEnv } from 'znv';
import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import untildify from 'untildify';
import {
  CLI_SETTINGS_STORE,
  DEFAULT_REGISTRY_ADDRESS,
  DEFAULT_CANNON_DIRECTORY,
  DEFAULT_REGISTRY_PROVIDER_URL,
} from './constants';
import { filterSettings } from './helpers';
import { ethers } from 'ethers';

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
  privateKey?: string;

  /**
   * the url of the IPFS endpoint to use as a storage base. defaults to localhost IPFS
   */
  ipfsUrl?: string;

  /**
   * the IPFS url to use when publishing. If you have an IPFS cluster, or a pinning service, this is a good place to put its IPFS Proxy publish endpoint. If not specified, your packages wont be uploaded to remote ipfs.
   */
  publishIpfsUrl?: string;

  /**
   * URL to use to write a package to the registry. Defaults to `frame,${DEFAULT_REGISTRY_PROVIDER_URL}`
   */
  registryProviderUrl: string;

  /**
   * chain Id of the registry. Defaults to `1`. Overridden by `registryProviderUrl`
   */
  registryChainId: string;

  /**
   * Address of the registry
   */
  registryAddress: string;

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
      .refine(
        (val) => ethers.utils.isHexString(val, 32),
        (val) => ({ message: `Private key is invalid` })
      )
      .default(fileSettings.privateKey as string).optional(),
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
    CANNON_REGISTRY_PROVIDER_URL: z
      .string()
      .default(fileSettings.registryProviderUrl || `frame,${DEFAULT_REGISTRY_PROVIDER_URL}`),
    CANNON_REGISTRY_CHAIN_ID: z.string().default(fileSettings.registryChainId || '1'),
    CANNON_REGISTRY_ADDRESS: z
      .string()
      .startsWith('0x')
      .length(42)
      .default(fileSettings.registryAddress || DEFAULT_REGISTRY_ADDRESS),
    CANNON_REGISTRY_PRIORITY: z.enum(['onchain', 'local']).default(fileSettings.registryPriority || 'onchain'),
    CANNON_ETHERSCAN_API_URL: z.string().url().default(fileSettings.etherscanApiUrl as string).optional(),
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

  if (!Object.values(fileSettings).length) {
    console.warn(
      `settings not configured: please create file ${cliSettingsStore} for better performance. See https://usecannon.com/learn/cli#setup for more information.`
    );
    console.warn(`using default settings (cannon repo, ${DEFAULT_REGISTRY_PROVIDER_URL})`);
  }

  const {
    CANNON_DIRECTORY,
    CANNON_SETTINGS,
    CANNON_PROVIDER_URL,
    CANNON_PRIVATE_KEY,
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
      ipfsUrl: CANNON_IPFS_URL,
      publishIpfsUrl: CANNON_PUBLISH_IPFS_URL,
      registryProviderUrl: CANNON_REGISTRY_PROVIDER_URL,
      registryChainId: CANNON_REGISTRY_CHAIN_ID,
      registryAddress: CANNON_REGISTRY_ADDRESS,
      registryPriority: CANNON_REGISTRY_PRIORITY,
      etherscanApiUrl: CANNON_ETHERSCAN_API_URL,
      etherscanApiKey: CANNON_ETHERSCAN_API_KEY,
      quiet: CANNON_QUIET,
      trace: TRACE,
    },
    _.pickBy(overrides)
  );

  debug('got settings', filterSettings(finalSettings));

  return finalSettings;
}

export const resolveCliSettings = _.memoize(_resolveCliSettings);
