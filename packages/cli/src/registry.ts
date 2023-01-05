import { CannonRegistry, OnChainRegistry } from "@usecannon/builder";

import path from 'path';
import fs from 'fs-extra';
import { CliSettings } from "./settings";

import { ethers } from 'ethers';
import _ from "lodash";


// in addition to loading packages from the , also stores tags locally to remember between local builds
export class LocalRegistry implements CannonRegistry {

    packagesDir: string;

    constructor(packagesDir: string) {
        this.packagesDir = packagesDir;
    }

    getTagReferenceStorage(packageRef: string, variant: string): string {
        return path.join(this.packagesDir, 'tags', `${packageRef.replace(':', '_')}_${variant}.txt`);
    }

    async getUrl(packageRef: string, variant: string): Promise<string | null> {
        return (await fs.readFile(this.getTagReferenceStorage(packageRef, variant))).toString()
    }

    async publish(
        packagesNames: string[],
        variant: string,
        url: string
    ): Promise<string[]> {
        for (const packageName of packagesNames) {
            const file = this.getTagReferenceStorage(packageName, variant);
            console.log('write file', file);
            await fs.mkdirp(path.dirname(file));
            await fs.writeFile(file, url);
            console.log('wrote');
        }

        return [];
    }
}

export class FallbackRegistry implements CannonRegistry {

    registries: any[];

    constructor(registries: any[]) {
        this.registries = registries;
    }
    
    async getUrl(name: string, version: string): Promise<string | null> {
        for (const registry of this.registries) {
            try {
                const result = await registry.getUrl(name, version);

                if (result) {
                    return result;
                }
            } catch (err) {
                console.error('WARNING: error caught in registry:', err);
            }
        }

        return null;
    }

    async publish(
        packagesNames: string[],
        variant: string,
        url: string
    ): Promise<string[]> {
        // the fallback registry is usually something easy to write to or get to later
        return _.last(this.registries).publish(packagesNames, variant, url);
    }
}

export function createDefaultReadRegistry(settings: CliSettings): FallbackRegistry {
    const provider = new ethers.providers.JsonRpcProvider(settings.registryProviderUrl);

    return new FallbackRegistry([
        new OnChainRegistry({ signerOrProvider: provider, address: '' }),
        new LocalRegistry(settings.cannonDirectory)
    ])
}