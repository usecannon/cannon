import os from 'node:os';
import path from 'node:path';
import { CannonRegistry, FallbackRegistry, InMemoryRegistry, OnChainRegistry, PackageReference } from '@usecannon/builder';
import { yellowBright } from 'chalk';
import Debug from 'debug';
import fs from 'fs-extra';
import _ from 'lodash';
import { CliSettings } from './settings';
import { isConnectedToInternet } from './util/is-connected-to-internet';
import { resolveRegistryProviders } from './util/provider';

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

  getTagReferenceStorage(packageRef: string, chainId: number): string {
    const { name, version, preset } = new PackageReference(packageRef);
    const variant = `${chainId}-${preset}`;

    return path.join(this.packagesDir, 'tags', `${name}_${version}_${variant}.txt`);
  }

  getMetaTagReferenceStorage(packageRef: string, chainId: number): string {
    const { name, version, preset } = new PackageReference(packageRef);
    const variant = `${chainId}-${preset}`;

    return path.join(this.packagesDir, 'tags', `${name}_${version}_${variant}.txt.meta`);
  }

  async getUrl(packageRef: string, chainId: number): Promise<string | null> {
    const { fullPackageRef } = new PackageReference(packageRef);

    const baseResolved = await super.getUrl(fullPackageRef, chainId);
    if (baseResolved) {
      return baseResolved;
    }

    debug(
      'load local package link',
      fullPackageRef,
      'at file',
      this.getTagReferenceStorage(fullPackageRef, chainId).replace(os.homedir(), '')
    );
    try {
      return (await fs.readFile(this.getTagReferenceStorage(fullPackageRef, chainId))).toString().trim();
    } catch (err) {
      debug('could not load:', err);
      return null;
    }
  }

  async getMetaUrl(packageRef: string, chainId: number): Promise<string | null> {
    const { fullPackageRef } = new PackageReference(packageRef);

    try {
      debug('load local meta package link', fullPackageRef, 'at file', this.getMetaTagReferenceStorage(packageRef, chainId));
      return (await fs.readFile(this.getMetaTagReferenceStorage(fullPackageRef, chainId))).toString().trim();
    } catch (err) {
      debug('could not load:', err);
      return null;
    }
  }

  async publish(packagesNames: string[], chainId: number, url: string, metaUrl: string): Promise<string[]> {
    for (const packageName of packagesNames) {
      const { fullPackageRef } = new PackageReference(packageName);
      debug('package local link', packageName);
      const file = this.getTagReferenceStorage(fullPackageRef, chainId);
      const metaFile = this.getMetaTagReferenceStorage(fullPackageRef, chainId);
      await fs.mkdirp(path.dirname(file));
      await fs.writeFile(file, url);
      await fs.writeFile(metaFile, metaUrl);
    }

    return [];
  }

  async scanDeploys(packageRef: string, chainId?: number): Promise<{ name: string; chainId: number }[]> {
    const ref = PackageReference.parse(packageRef);
    const allTags = await fs.readdir(path.join(this.packagesDir, 'tags'));

    debug('scanning deploys in:', path.join(this.packagesDir, 'tags'), allTags);
    debug(`looking for ${packageRef}, ${chainId}`);

    return allTags
      .filter((t) => {
        if (t.endsWith('.txt')) {
          debug(`checking ${packageRef}, ${chainId} for a match with ${t}`);

          const [tagName, tagVersion, tagVariant] = t.replace('.txt', '').split('_');
          const [tagChainId, tagPreset] = tagVariant.split(/-(.*)/s); // split on first ocurrance only (because the preset can have -)

          if (chainId && tagChainId !== chainId.toString()) return false;

          let tag: PackageReference;
          try {
            tag = PackageReference.from(tagName, tagVersion, tagPreset);
          } catch (er) {
            return false;
          }

          if (ref.name && ref.version && ref.preset) {
            return ref.name === tag.name && ref.version === tag.version && ref.preset === tag.preset;
          } else if (ref.name && ref.version) {
            return ref.name === tag.name && ref.version === tag.version;
          } else {
            return ref.name === tag.name;
          }
        }
      })
      .map((t) => {
        const [name, version, tagVariant] = t.replace('.txt', '').split('_');
        const [chainId, preset] = tagVariant.split(/-(.*)/s);
        return { name: `${name}:${version}@${preset}`, chainId: Number.parseInt(chainId) };
      });
  }

  async getAllUrls(filterPackage: string, chainId: number): Promise<Set<string>> {
    if (!filterPackage) {
      return new Set();
    }
    const { name, version, preset } = new PackageReference(filterPackage);
    const filterVariant = `${chainId}-${preset}`;

    const urls = (await fs.readdir(this.packagesDir))
      .filter((f) => f.match(new RegExp(`${name || '.*'}_${version || '.*'}_${filterVariant || '.*'}`)))
      .map((f) => fs.readFileSync(path.join(this.packagesDir, f)).toString('utf8'));

    return new Set(urls);
  }
}

async function checkLocalRegistryOverride({
  fullPackageRef,
  chainId,
  result,
  registry,
  fallbackRegistry,
}: {
  fullPackageRef: string;
  chainId: number;
  result: string;
  registry: OnChainRegistry | LocalRegistry;
  fallbackRegistry: FallbackRegistry;
}) {
  const localResult = await _.last(fallbackRegistry.registries).getUrl(fullPackageRef, chainId);
  if (registry instanceof OnChainRegistry && localResult && localResult != result) {
    console.log(
      yellowBright(
        `⚠️  The package ${fullPackageRef} was found on the official on-chain registry, but you also have a local build of this package. To use this local build instead, run this command with '--registry-priority local'`
      )
    );
  }
}

export async function createDefaultReadRegistry(
  settings: CliSettings,
  additionalRegistries: CannonRegistry[] = []
): Promise<FallbackRegistry> {
  const registryProviders = await resolveRegistryProviders(settings);

  const localRegistry = new LocalRegistry(settings.cannonDirectory);
  const onChainRegistries = registryProviders.map(
    (p, i) => new OnChainRegistry({ provider: p.provider, address: settings.registries[i].address })
  );

  if (!(await isConnectedToInternet())) {
    debug('not connected to internet, using local registry only');
    // When not connected to the internet, we don't want to check the on-chain registry version to not throw an error
    console.log(yellowBright('⚠️  You are not connected to the internet. Using local registry only'));
    return new FallbackRegistry([...additionalRegistries, localRegistry]);
  } else if (settings.registryPriority === 'local') {
    debug('local registry is the priority, using local registry first');
    return new FallbackRegistry([...additionalRegistries, localRegistry, ...onChainRegistries]);
  } else {
    debug('on-chain registry is the priority, using on-chain registry first');
    const fallbackRegistry = new FallbackRegistry([...additionalRegistries, ...onChainRegistries, localRegistry]);

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
