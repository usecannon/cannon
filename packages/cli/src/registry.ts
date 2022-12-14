import { CannonRegistry } from "@usecannon/builder";

import path from 'path';
import fs from 'fs-extra';
import { CliSettings } from "./settings";

import { ethers } from 'ethers';


// in addition to loading packages from the , also stores tags locally to remember between local builds
export class LocalRegistry /* TODO: implements something? */ {

    packagesDir: string;

    constructor(packagesDir: string) {
        this.packagesDir = packagesDir;
    }

    getTagReferenceStorage(name: string, version: string, variant: string): string {
        return path.join(this.packagesDir, 'tags', `${name}_${version}_${variant}.txt`);
    }

    async getUrl(name: string, version: string, variant: string): Promise<string | null> {
        return (await fs.readFile(this.getTagReferenceStorage(name, version, variant))).toString()
    }

    async publish(
        packagesNames: string[],
        variant: string,
        url: string
    ): Promise<string[]> {
        for (const packageName of packagesNames) {
            const [name, version] = packageName.split(':');
            await fs.writeFile(this.getTagReferenceStorage(name, version, variant), url);
        }

        return [];
    }
}

export class FallbackRegistry /* TODO: implements something? */ {

    registries: any[];

    constructor(registries: any[]) {
        this.registries = registries;
    }
    
    async getUrl(name: string, version: string): Promise<string | null> {
        for (const registry of this.registries) {
            const result = await registry.getUrl(name, version);

            if (result) {
                return result;
            }
        }

        return null;
    }

    async publish(
        packagesNames: string[],
        url: string
    ): Promise<string[]> {
        return this.registries[0].publish(packagesNames, url);
    }
}

export function createDefaultReadRegistry(settings: CliSettings): FallbackRegistry {
    const provider = new ethers.providers.JsonRpcProvider(settings.registryProviderUrl);

    return new FallbackRegistry([
        new CannonRegistry({ signerOrProvider: provider, address: '' }),
        new LocalRegistry('~/.local/share/cannon')
    ])
}