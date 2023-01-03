import fs from 'fs-extra';
import untildify from 'untildify';
import { DEFAULT_CANNON_DIRECTORY } from './constants';

const CLI_SETTINGS_STORE = '~/.local/share/cannon/settings.json';

export type CliSettings = {
    ipfsUrl: string;
    registryProviderUrl: string;
    cannonDirectory: string;
}

export function resolveCliSettings(): CliSettings {
    const fileSettings: CliSettings | null = fs.existsSync(CLI_SETTINGS_STORE) ? fs.readJsonSync(CLI_SETTINGS_STORE) : null;

    if (!fileSettings) {
        // TODO: prompt user instead of printing error here
        throw new Error(`settings not configured: please create file ${CLI_SETTINGS_STORE} and put settings.`);
    }

    return {
        cannonDirectory: untildify(process.env.CANNON_DIRECTORY || DEFAULT_CANNON_DIRECTORY),
        ipfsUrl: process.env.CANNON_IPFS_URL || fileSettings.ipfsUrl,
        registryProviderUrl: process.env.CANNON_REGISTRY_PROVIDER_URL || fileSettings.registryProviderUrl
    }
}