import { CannonRegistry, OnChainRegistry, InMemoryRegistry, FallbackRegistry } from '@usecannon/builder';
import path from 'path';
import fs from 'fs-extra';
import { ethers } from 'ethers';
import Debug from 'debug';
import { yellowBright } from 'chalk';

import { CliSettings } from './settings';
import { resolveProviderAndSigners } from './util/provider';

const debug = Debug('cannon:cli:registry');

/**
 * stores packages in the filesystem, using the filename as a key and the contents as the value. very simple is the intent.
 */
export class LocalRegistry extends CannonRegistry {
  packagesDir: string;

  constructor(packagesDir: string) {
    super();
    this.packagesDir = packagesDir;
  }

  getTagReferenceStorage(packageRef: string, variant: string): string {
    return path.join(this.packagesDir, 'tags', `${packageRef.replace(':', '_')}_${variant}.txt`);
  }

  async getUrl(packageRef: string, variant: string): Promise<string | null> {
    const baseResolved = await super.getUrl(packageRef, variant);
    if (baseResolved) {
      return baseResolved;
    }

    debug('load local package link', packageRef, variant, 'at file', this.getTagReferenceStorage(packageRef, variant));
    return (await fs.readFile(this.getTagReferenceStorage(packageRef, variant))).toString().trim();
  }

  async publish(packagesNames: string[], variant: string, url: string): Promise<string[]> {
    for (const packageName of packagesNames) {
      debug('package local link', packageName);
      const file = this.getTagReferenceStorage(packageName, variant);
      await fs.mkdirp(path.dirname(file));
      await fs.writeFile(file, url);
    }

    return [];
  }

  async scanDeploys(packageName: RegExp | string, variant: RegExp | string): Promise<{ name: string; variant: string }[]> {
    const allTags = await fs.readdir(path.join(this.packagesDir, 'tags'));

    debug('scanning deploys in:', path.join(this.packagesDir, 'tags'), allTags);
    debug(`looking for ${packageName}, ${variant}`);

    return allTags
      .filter((t) => {
        const [name, version, tagVariant] = t.replace('.txt', '').split('_');

        return `${name}:${version}`.match(packageName) && tagVariant.match(variant);
      })
      .map((t) => {
        const [name, version, tagVariant] = t.replace('.txt', '').split('_');
        return { name: `${name}:${version}`, variant: tagVariant };
      });
  }
}

export async function createDefaultReadRegistry(settings: CliSettings, quiet = true): Promise<FallbackRegistry> {
  const { provider } = await resolveProviderAndSigners(settings, parseInt(settings.registryChainId));

  const localRegistry = new LocalRegistry(settings.cannonDirectory);
  const onChainRegistry = new OnChainRegistry({ signerOrProvider: provider, address: settings.registryAddress });
  const fallbackRegistry = new FallbackRegistry([localRegistry, onChainRegistry]);

  fallbackRegistry
    .on(
      'getUrl',
      async ({
        packageRef,
        variant,
        result,
        registry,
      }: {
        packageRef: string;
        variant: string;
        result: string;
        registry: LocalRegistry;
      }) => {
        const onChainResult = await onChainRegistry.getUrl(packageRef, variant);

        if (registry instanceof LocalRegistry && onChainResult && onChainResult != result && !quiet) {
          console.log(
            yellowBright(
              `⚠️  You are using a local build of ${packageRef} which is different than the version available on the registry. To remove your local build, delete ${localRegistry.getTagReferenceStorage(
                packageRef,
                variant
              )}`
            )
          );
        }
      }
    )
    .catch((err: Error) => {
      throw err;
    });

  return fallbackRegistry;
}

export function createDryRunRegistry(settings: CliSettings): FallbackRegistry {
  const provider = new ethers.providers.JsonRpcProvider(settings.registryProviderUrl);

  return new FallbackRegistry([
    new InMemoryRegistry(),
    new LocalRegistry(settings.cannonDirectory),
    new OnChainRegistry({ signerOrProvider: provider, address: settings.registryAddress }),
  ]);
}
