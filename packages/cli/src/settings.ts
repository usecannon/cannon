import Debug from 'debug';
import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import { yellow } from 'chalk';
import untildify from 'untildify';
import * as viem from 'viem';
import { parseEnv } from 'znv';
import { z } from 'zod';
import { DEFAULT_REGISTRY_CONFIG } from '@usecannon/builder';
import { CLI_SETTINGS_STORE, DEFAULT_CANNON_DIRECTORY } from './constants';
import { checkAndNormalizePrivateKey, filterSettings } from './helpers';
import { warn, log } from './util/console';

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

export const RPC_URL_DEFAULT = 'frame,direct';

const deprecatedWarn = _.once((deprecatedFlag: string, newFlag: string) => {
  log();
  warn(yellow(`The ${deprecatedFlag} option will be deprecated soon. Use ${newFlag} instead.`));
  log();
});

/**
 * Settings zod schema.
 * Check env vars and set default values if needed
 */

function cannonSettingsSchema(fileSettings: Omit<CliSettings, 'cannonDirectory'>) {
  return {
    CANNON_DIRECTORY: z.string().default(DEFAULT_CANNON_DIRECTORY),
    CANNON_SETTINGS: z.string().optional(),
    CANNON_PROVIDER_URL: z.string().default(fileSettings.providerUrl || RPC_URL_DEFAULT),
    CANNON_RPC_URL: z.string().default(fileSettings.rpcUrl || RPC_URL_DEFAULT),
    CANNON_PRIVATE_KEY: z
      .string()
      .optional()
      .default(fileSettings.privateKey as string),
    CANNON_IPFS_TIMEOUT: z
      .number()
      .optional()
      .default(fileSettings.ipfsTimeout || 300000),
    CANNON_IPFS_RETRIES: z
      .number()
      .optional()
      .default(fileSettings.ipfsRetries || 3),
    CANNON_IPFS_URL: z
      .string()
      .optional()
      .default(fileSettings.ipfsUrl || ''),
    CANNON_WRITE_IPFS_URL: z
      .string()
      .optional()
      .default(fileSettings.writeIpfsUrl || ''),
    CANNON_PUBLISH_IPFS_URL: z
      .string()
      .url()
      .optional()
      .default(fileSettings.publishIpfsUrl as string),
    CANNON_REGISTRY_RPC_URL: z.string().url().optional(),
    CANNON_REGISTRY_CHAIN_ID: z.string().optional(),
    CANNON_REGISTRY_ADDRESS: z
      .string()
      .optional()
      .refine((v) => !v || viem.isAddress(v), 'must be address'),
    CANNON_REGISTRY_PRIORITY: z.enum(['onchain', 'local', 'offline']).default(fileSettings.registryPriority || 'onchain'),
    CANNON_ETHERSCAN_API_URL: z
      .string()
      .url()
      .optional()
      .default(fileSettings.etherscanApiUrl as string),
    CANNON_ETHERSCAN_API_KEY: z.string().length(34).optional().default(fileSettings.etherscanApiKey),
    CANNON_QUIET: z.boolean().default(fileSettings.quiet || false),
    CANNON_E2E: z.boolean().default(false),
    TRACE: z.boolean().default(false),
  };
}

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
    CANNON_RPC_URL,
    CANNON_PRIVATE_KEY,
    CANNON_IPFS_TIMEOUT,
    CANNON_IPFS_RETRIES,
    CANNON_IPFS_URL,
    CANNON_WRITE_IPFS_URL,
    CANNON_PUBLISH_IPFS_URL,
    CANNON_REGISTRY_RPC_URL,
    CANNON_REGISTRY_CHAIN_ID,
    CANNON_REGISTRY_ADDRESS,
    CANNON_REGISTRY_PRIORITY,
    CANNON_ETHERSCAN_API_URL,
    CANNON_ETHERSCAN_API_KEY,
    CANNON_QUIET,
    CANNON_E2E,
    TRACE,
  } = parseEnv(process.env, cannonSettingsSchema(fileSettings));

  const finalSettings = _.assign(
    {
      cannonDirectory: untildify(CANNON_DIRECTORY),
      cannonSettings: CANNON_SETTINGS,
      rpcUrl: CANNON_RPC_URL || CANNON_PROVIDER_URL,
      privateKey: CANNON_PRIVATE_KEY,
      ipfsTimeout: CANNON_IPFS_TIMEOUT,
      ipfsRetries: CANNON_IPFS_RETRIES,
      ipfsUrl: CANNON_IPFS_URL,
      writeIpfsUrl: CANNON_WRITE_IPFS_URL,
      publishIpfsUrl: CANNON_PUBLISH_IPFS_URL,
      registries:
        CANNON_REGISTRY_ADDRESS && (CANNON_REGISTRY_RPC_URL || CANNON_REGISTRY_CHAIN_ID)
          ? [
              {
                name: 'Custom Network',
                rpcUrl: CANNON_REGISTRY_RPC_URL ? [CANNON_REGISTRY_RPC_URL] : undefined,
                chainId: CANNON_REGISTRY_CHAIN_ID ? Number(CANNON_REGISTRY_CHAIN_ID) : undefined,
                address: CANNON_REGISTRY_ADDRESS as viem.Address,
              },
            ]
          : DEFAULT_REGISTRY_CONFIG,
      registryPriority: CANNON_REGISTRY_PRIORITY,
      etherscanApiUrl: CANNON_ETHERSCAN_API_URL,
      etherscanApiKey: CANNON_ETHERSCAN_API_KEY,
      quiet: CANNON_QUIET,
      isE2E: CANNON_E2E,
      trace: TRACE,
    },
    _.pickBy(overrides)
  ) as CliSettings;

  if (overrides.providerUrl && !overrides.rpcUrl) {
    deprecatedWarn('--provider-url', '--rpc-url');
    finalSettings.rpcUrl = overrides.providerUrl;
  }

  // Check and normalize private keys
  finalSettings.privateKey = checkAndNormalizePrivateKey(finalSettings.privateKey);

  if (overrides.registryAddress && (overrides.registryRpcUrl || overrides.registryChainId)) {
    finalSettings.registries = [
      {
        name: 'Custom Network',
        rpcUrl: overrides.registryRpcUrl ? [overrides.registryRpcUrl] : undefined,
        chainId: overrides.registryChainId ? Number(overrides.registryChainId) : undefined,
        address: overrides.registryAddress ? overrides.registryAddress : (CANNON_REGISTRY_ADDRESS as viem.Address),
      },
    ];
  }

  debug('final settings:', filterSettings(finalSettings));

  return finalSettings;
}

export const resolveCliSettings = _.memoize(_resolveCliSettings);
