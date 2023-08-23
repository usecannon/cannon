import fs from 'fs-extra';
import path from 'path';
import _ from 'lodash';
import untildify from 'untildify';
import {
  DEFAULT_CANNON_DIRECTORY,
  DEFAULT_REGISTRY_ADDRESS,
  DEFAULT_REGISTRY_PROVIDER_URL,
  DEFAULT_REGISTRY_IPFS_ENDPOINT,
  CLI_SETTINGS_STORE,
} from './constants';

import Debug from 'debug';

const debug = Debug('cannon:cli:settings');

export type CliSettings = {
  /// provider used for `build`
  providerUrl?: string;

  /// private key(s) of default signer that should be used for build, comma separated
  privateKey?: string;

  /// the url of the IPFS endpoint to use as a storage base. defaults to localhost IPFS
  ipfsUrl?: string;

  /// the IPFS url to use when publishing. If you have an IPFS cluster, or a pinning service, this is a good place to put its IPFS Proxy publish endpoint. If not specified, your packages wont be uploaded to remote ipfs.
  publishIpfsUrl?: string;

  /// URL to use to write a package to the registry.
  registryProviderUrl?: string;

  /// chain Id of the registry. Defaults to `1`. Overridden by `registryProviderUrl`
  registryChainId: string;

  /// Address of the registry
  registryAddress: string;

  /// Which registry to read from first. Defaults to `onchain`
  registryPriority: 'local' | 'onchain';

  /// Directory to load configurations from, for local registry, and
  cannonDirectory: string;

  // URL of etherscan API for verification
  etherscanApiUrl: string;

  // Etherscan API Key for verification
  etherscanApiKey: string;

  // Whether to suppress extra output
  quiet: boolean;

  // Gas price to use for transactions
  gasPrice?: string;

  // Base and Priority gas fee to use for transactions - EIP1559
  gasFee?: string;
  priorityGasFee?: string;
};

const getRegistryProviderUrl = (fileSettings: any, privateKey: string): string => {
  const registryProviderUrl = process.env.CANNON_REGISTRY_PROVIDER_URL || fileSettings.registryProviderUrl;

  if (registryProviderUrl && privateKey) {
    return registryProviderUrl;
  }
  if (registryProviderUrl && !privateKey) {
    console.warn(
      `\n\nUsing Frame instead of configured registryProviderUrl (${registryProviderUrl}), supply --private-key to change.\n\n`
    );
  }
  return `frame,${DEFAULT_REGISTRY_PROVIDER_URL}`;
};

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
      `settings not configured: please create file ${cliSettingsStore} for better performance. See https://usecannon.com/learn/technical-reference#setup for more information.`
    );
    console.warn(`using default settings (${DEFAULT_REGISTRY_IPFS_ENDPOINT}, ${DEFAULT_REGISTRY_PROVIDER_URL})`);
  }
  const privateKey = (process.env.CANNON_PRIVATE_KEY || fileSettings.privateKey) as string;
  const finalSettings = _.assign(
    {
      cannonDirectory: untildify(process.env.CANNON_DIRECTORY || DEFAULT_CANNON_DIRECTORY),
      providerUrl: process.env.CANNON_PROVIDER_URL || fileSettings.providerUrl || 'frame,direct',
      privateKey,
      ipfsUrl: process.env.CANNON_IPFS_URL || fileSettings.ipfsUrl,
      publishIpfsUrl: process.env.CANNON_PUBLISH_IPFS_URL || fileSettings.publishIpfsUrl,
      registryProviderUrl: getRegistryProviderUrl(fileSettings, privateKey),
      registryChainId: process.env.CANNON_REGISTRY_CHAIN_ID || fileSettings.registryChainId || '1',
      registryAddress: process.env.CANNON_REGISTRY_ADDRESS || fileSettings.registryAddress || DEFAULT_REGISTRY_ADDRESS,
      registryPriority: process.env.CANNON_REGISTRY_PRIORITY || fileSettings.registryPriority || 'onchain',
      etherscanApiUrl: process.env.CANNON_ETHERSCAN_API_URL || fileSettings.etherscanApiUrl || '',
      etherscanApiKey: process.env.CANNON_ETHERSCAN_API_KEY || fileSettings.etherscanApiKey || '',
      quiet: process.env.CANNON_QUIET === 'true' || fileSettings.quiet || false,
    },
    overrides
  );

  debug('got settings', finalSettings);

  return finalSettings;
}

export const resolveCliSettings = _.once(_resolveCliSettings);
