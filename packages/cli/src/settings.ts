import fs from 'fs-extra';
import path from 'path';
import untildify from 'untildify';
import { DEFAULT_CANNON_DIRECTORY } from './constants';

const CLI_SETTINGS_STORE = 'settings.json';

export type CliSettings = {
  ipfsUrl: string;
  registryProviderUrl: string;
  cannonDirectory: string;
};

export function resolveCliSettings(): CliSettings {
  const cliSettingsStore = untildify(
    path.join(process.env.CANNON_DIRECTORY || DEFAULT_CANNON_DIRECTORY, CLI_SETTINGS_STORE)
  );

  const fileSettings: CliSettings | null = fs.existsSync(cliSettingsStore) ? fs.readJsonSync(cliSettingsStore) : null;

  if (!fileSettings) {
    // TODO: prompt user instead of printing error here
    throw new Error(`settings not configured: please create file ${cliSettingsStore} and put settings.`);
  }

  return {
    cannonDirectory: untildify(process.env.CANNON_DIRECTORY || DEFAULT_CANNON_DIRECTORY),
    ipfsUrl: process.env.CANNON_IPFS_URL || fileSettings.ipfsUrl,
    registryProviderUrl: process.env.CANNON_REGISTRY_PROVIDER_URL || fileSettings.registryProviderUrl,
  };
}
