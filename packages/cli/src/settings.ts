import fs from 'fs-extra';
import path from 'path';
import untildify from 'untildify';
import {
  DEFAULT_CANNON_DIRECTORY,
  DEFAULT_REGISTRY_ADDRESS,
  DEFAULT_REGISTRY_ENDPOINT,
  DEFAULT_REGISTRY_IPFS_ENDPOINT,
} from './constants';

import Debug from 'debug';

const debug = Debug('cannon:cli:settings');

const CLI_SETTINGS_STORE = 'settings.json';

export type CliSettings = {
  ipfsUrl: string;
  publishIpfsUrl?: string;
  registryProviderUrl: string;
  registryAddress: string;
  cannonDirectory: string;
};

// TODO: this function is ugly
export function resolveCliSettings(): CliSettings {
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
      `settings not configured: please create file ${cliSettingsStore} for better performance. See http:// for more information.`
    );
    console.warn(`using default settings (${DEFAULT_REGISTRY_IPFS_ENDPOINT}, ${DEFAULT_REGISTRY_ENDPOINT})`);
  }

  const finalSettings = {
    cannonDirectory: untildify(process.env.CANNON_DIRECTORY || DEFAULT_CANNON_DIRECTORY),
    ipfsUrl: process.env.CANNON_IPFS_URL || fileSettings.ipfsUrl || DEFAULT_REGISTRY_IPFS_ENDPOINT,
    publishIpfsUrl: process.env.CANNON_PUBLISH_IPFS_URL || fileSettings.publishIpfsUrl,
    registryProviderUrl:
      process.env.CANNON_REGISTRY_PROVIDER_URL || fileSettings.registryProviderUrl || DEFAULT_REGISTRY_ENDPOINT,
    registryAddress: process.env.CANNON_REGISTRY_ADDRESS || fileSettings.registryAddress || DEFAULT_REGISTRY_ADDRESS,
  };

  debug('got settings', finalSettings);

  return finalSettings;
}
