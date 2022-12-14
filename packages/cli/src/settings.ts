import fs from 'fs-extra';

const CLI_SETTINGS_STORE = '~/.local/share/cannon/settings.json';

export type CliSettings = {
    ipfsUrl: string;
    registryProviderUrl: string;
}

export function resolveCliSettings(): CliSettings {


    const fileSettings: CliSettings | null = fs.existsSync(CLI_SETTINGS_STORE) ? fs.readJsonSync(CLI_SETTINGS_STORE) : null;

    if (!fileSettings) {
        // TODO: prompt user instead of printing error here
        throw new Error(`settings not configured: please create file ${CLI_SETTINGS_STORE} and put settings.`);
    }

    return {
        ipfsUrl: process.env.CANNON_IPFS_URL || fileSettings.ipfsUrl,
        registryProviderUrl: process.env.CANNON_REGISTRY_PROVIDER_URL || fileSettings.registryProviderUrl
    }
}