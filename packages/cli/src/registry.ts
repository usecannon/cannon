import { CannonRegistry, OnChainRegistry, InMemoryRegistry, FallbackRegistry } from '@usecannon/builder';
import _ from 'lodash';
import path from 'path';
import fs from 'fs-extra';
import Debug from 'debug';
import { yellowBright } from 'chalk';

import { CliSettings } from './settings';
import { resolveRegistryProvider } from './util/provider';
import { isConnectedToInternet } from './util/is-connected-to-internet';

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

  getLabel() {
    return 'local';
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
    try {
      return (await fs.readFile(this.getTagReferenceStorage(packageRef, variant))).toString().trim();
    } catch (err) {
      debug('could not load:', err);
      return null;
    }
  }

  async getMetaUrl(packageName: string, variant: string): Promise<string | null> {
    try {
      debug(
        'load local meta package link',
        packageName,
        variant,
        'at file',
        this.getTagReferenceStorage(packageName, variant) + '.meta'
      );
      return (await fs.readFile(this.getTagReferenceStorage(packageName, variant) + '.meta')).toString().trim();
    } catch (err) {
      debug('could not load:', err);
      return null;
    }
  }

  async publish(packagesNames: string[], variant: string, url: string, metaUrl: string): Promise<string[]> {
    for (const packageName of packagesNames) {
      debug('package local link', packageName);
      const file = this.getTagReferenceStorage(packageName, variant);
      await fs.mkdirp(path.dirname(file));
      await fs.writeFile(file, url);
      await fs.writeFile(file + '.meta', metaUrl);
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

        return !t.endsWith('.meta') && `${name}:${version}`.match(packageName) && tagVariant.match(variant);
      })
      .map((t) => {
        const [name, version, tagVariant] = t.replace('.txt', '').split('_');
        return { name: `${name}:${version}`, variant: tagVariant };
      });
  }

  async getAllUrls(filterPackage: string, filterVariant: string): Promise<Set<string>> {
    if (!filterPackage) {
      return new Set();
    }
    const [name, version] = filterPackage.split(':');

    const urls = (await fs.readdir(this.packagesDir))
      .filter((f) => f.match(new RegExp(`${name || '.*'}_${version || '.*'}_${filterVariant || '.*'}`)))
      .map((f) => fs.readFileSync(path.join(this.packagesDir, f)).toString('utf8'));

    return new Set(urls);
  }
}

async function checkLocalRegistryOverride({
  packageRef,
  variant,
  result,
  registry,
  fallbackRegistry,
}: {
  packageRef: string;
  variant: string;
  result: string;
  registry: OnChainRegistry | LocalRegistry;
  fallbackRegistry: FallbackRegistry;
}) {
  const localResult = await _.last(fallbackRegistry.registries).getUrl(packageRef, variant);
  if (registry instanceof OnChainRegistry && localResult && localResult != result) {
    console.log(
      yellowBright(
        `⚠️  The package ${packageRef} was found on the official on-chain registry, but you also have a local build of this package. To use this local build instead, run this command with '--registry local'`
      )
    );
  }
}

export async function createDefaultReadRegistry(
  settings: CliSettings,
  additionalRegistries: CannonRegistry[] = []
): Promise<FallbackRegistry> {
  const { provider } = await resolveRegistryProvider(settings);

  const localRegistry = new LocalRegistry(settings.cannonDirectory);
  const onChainRegistry = new OnChainRegistry({ signerOrProvider: provider, address: settings.registryAddress });

  if (!(await isConnectedToInternet())) {
    debug('not connected to internet, using local registry only');
    // When not connected to the internet, we don't want to check the on-chain registry version to not throw an error
    console.log(yellowBright('⚠️  You are not connected to the internet. Using local registry only'));
    return new FallbackRegistry([...additionalRegistries, localRegistry]);
  } else if (settings.registryPriority === 'local') {
    debug('local registry is the priority, using local registry first');
    return new FallbackRegistry([...additionalRegistries, localRegistry, onChainRegistry]);
  } else {
    debug('on-chain registry is the priority, using on-chain registry first');
    const fallbackRegistry = new FallbackRegistry([...additionalRegistries, onChainRegistry, localRegistry]);

    if (!settings.quiet) {
      fallbackRegistry.on('getUrl', checkLocalRegistryOverride).catch((err: Error) => {
        throw err;
      });
    }

    return fallbackRegistry;
  }
}

export async function createDryRunRegistry(settings: CliSettings): Promise<FallbackRegistry> {
  return createDefaultReadRegistry(settings, [new InMemoryRegistry()]);
}
