import fs from 'fs-extra';
import path from 'path';
import untildify from 'untildify';
import { DEFAULT_CANNON_DIRECTORY, DEFAULT_REGISTRY_ADDRESS, DEFAULT_REGISTRY_ENDPOINT, DEFAULT_REGISTRY_IPFS_ENDPOINT } from './constants';

const CLI_SETTINGS_STORE = 'settings.json';

export type CliSettings = {
  ipfsUrl: string;
  registryProviderUrl: string;
  registryAddress: string;
  cannonDirectory: string;
};

// TODO: this function is ugly
export function resolveCliSettings(): CliSettings {
  const cliSettingsStore = untildify(
    path.join(process.env.CANNON_DIRECTORY || DEFAULT_CANNON_DIRECTORY, CLI_SETTINGS_STORE)
  );

  let fileSettings: Omit<CliSettings, 'cannonDirectory'> | null
  if (process.env.CANNON_SETTINGS) {
    fileSettings = JSON.parse(process.env.CANNON_SETTINGS);
  }
  else {
    fileSettings = fs.existsSync(cliSettingsStore) ? fs.readJsonSync(cliSettingsStore) : null;
  }

  if (!fileSettings) {
    // TODO: prompt user instead of printing error here
    console.warn(`settings not configured: please create file ${cliSettingsStore} for better performance. See http:// for more information.`);
    console.warn(`using default settings (${DEFAULT_REGISTRY_IPFS_ENDPOINT}, ${DEFAULT_REGISTRY_ENDPOINT})`);
  }

  fileSettings = Object.assign(fileSettings || {}, {
    ipfsUrl: DEFAULT_REGISTRY_IPFS_ENDPOINT,
    registryProviderUrl: DEFAULT_REGISTRY_ENDPOINT,
    registryAddress: DEFAULT_REGISTRY_ADDRESS
  });

  return {
    cannonDirectory: untildify(process.env.CANNON_DIRECTORY || DEFAULT_CANNON_DIRECTORY),
    ipfsUrl: process.env.CANNON_IPFS_URL || fileSettings.ipfsUrl,
    registryProviderUrl: process.env.CANNON_REGISTRY_PROVIDER_URL || fileSettings.registryProviderUrl,
    registryAddress: process.env.CANNON_REGISTRY_ADDRESS || fileSettings.registryAddress
  };
}
