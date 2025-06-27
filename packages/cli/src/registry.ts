import { CannonRegistry, FallbackRegistry, InMemoryRegistry, OnChainRegistry, PackageReference } from '@usecannon/builder';
import { yellowBright } from 'chalk';
import Debug from 'debug';
import fs from 'fs-extra';
import _ from 'lodash';
import os from 'os';
import path from 'path';
import * as viem from 'viem';
import { CliSettings } from './settings';
import { log } from './util/console';
import { isConnectedToInternet } from './util/is-connected-to-internet';
import { resolveRegistryProviders, ProviderAction } from './util/provider';

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

  getTagMutabilityStorage(packageRef: string, chainId: number): string {
    const { name, version, preset } = new PackageReference(packageRef);
    const variant = `${chainId}-${preset}`;

    return path.join(this.packagesDir, 'tags', `${name}_${version}_${variant}.txt.mutability`);
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

  async getUrl(packageRef: string, chainId: number): Promise<{ url: string | null; mutability: 'version' | 'tag' | '' }> {
    const { fullPackageRef } = new PackageReference(packageRef);

    const baseResolved = await super.getUrl(fullPackageRef, chainId);
    if (baseResolved.url) {
      return baseResolved;
    }

    debug(
      'load local package link',
      fullPackageRef,
      'at file',
      this.getTagReferenceStorage(fullPackageRef, chainId).replace(os.homedir(), '')
    );
    try {
      return {
        url: (await fs.readFile(this.getTagReferenceStorage(fullPackageRef, chainId))).toString().trim(),
        mutability: fs.existsSync(this.getTagMutabilityStorage(fullPackageRef, chainId))
          ? ((await fs.readFile(this.getTagMutabilityStorage(fullPackageRef, chainId))).toString().trim() as
              | 'version'
              | 'tag'
              | '')
          : '',
      };
    } catch (err) {
      debug('could not load:', err);
      return { url: null, mutability: '' };
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

  async publish(
    packagesNames: string[],
    chainId: number,
    url: string,
    metaUrl: string,
    mutabilityOverride?: 'version' | 'tag'
  ): Promise<string[]> {
    for (const packageName of packagesNames) {
      const { fullPackageRef } = new PackageReference(packageName);
      debug('package local link', packageName);
      const file = this.getTagReferenceStorage(fullPackageRef, chainId);
      const metaFile = this.getMetaTagReferenceStorage(fullPackageRef, chainId);
      await fs.mkdirp(path.dirname(file));
      await fs.writeFile(file, url);
      await fs.writeFile(metaFile, metaUrl);
      if (mutabilityOverride) {
        await fs.writeFile(this.getTagMutabilityStorage(fullPackageRef, chainId), mutabilityOverride);
      }
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
          const [tagChainId, tagPreset] = PackageReference.parseVariant(tagVariant);

          if (chainId && tagChainId !== Number(chainId)) {
            return false;
          }

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
        const [chainId, preset] = PackageReference.parseVariant(tagVariant);
        return { name: `${name}:${version}@${preset}`, chainId };
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

export class ReadOnlyOnChainRegistry extends OnChainRegistry {
  async publish(): Promise<string[]> {
    throw new Error('Cannot execute write operations on ReadOnlyOnChainRegistry');
  }

  async publishMany(): Promise<string[]> {
    throw new Error('Cannot execute write operations on ReadOnlyOnChainRegistry');
  }

  async setPackageOwnership(): Promise<viem.Hash> {
    throw new Error('Cannot execute write operations on ReadOnlyOnChainRegistry');
  }
}

export async function checkLocalRegistryOverride({
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
    log(
      yellowBright(
        `⚠️  The package ${fullPackageRef} was found on the official on-chain registry, but you also have a local build of this package. To use this local build instead, run this command with '--registry-priority local'`
      )
    );
  }
}

export async function createOnChainOnlyRegistry(cliSettings: CliSettings): Promise<FallbackRegistry> {
  const registryProviders = await resolveRegistryProviders({ cliSettings, action: ProviderAction.ReadProvider });
  return new FallbackRegistry(
    registryProviders.map(
      (p) => new ReadOnlyOnChainRegistry({ provider: p.provider, address: cliSettings.registries[0].address })
    )
  );
}

export async function createLocalOnlyRegistry(cliSettings: CliSettings): Promise<LocalRegistry> {
  return new LocalRegistry(cliSettings.cannonDirectory);
}

export async function createDefaultReadRegistry(
  cliSettings: CliSettings,
  additionalRegistries: CannonRegistry[] = []
): Promise<FallbackRegistry> {
  const registryProviders = await resolveRegistryProviders({ cliSettings, action: ProviderAction.ReadProvider });

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);
  const onChainRegistries = registryProviders.map(
    (p, i) => new ReadOnlyOnChainRegistry({ provider: p.provider, address: cliSettings.registries[i].address })
  );

  if (cliSettings.registryPriority === 'offline') {
    debug('running in offline mode, using local registry only');
    return new FallbackRegistry([...additionalRegistries, localRegistry]);
  } else if (!(await isConnectedToInternet())) {
    debug('not connected to internet, using local registry only');
    // When not connected to the internet, we don't want to check the on-chain registry version to not throw an error
    log(
      yellowBright(
        '⚠️  You are not connected to the internet or using a VPN that is limiting connectivity. Cannon will only use packages available locally.'
      )
    );
    return new FallbackRegistry([...additionalRegistries, localRegistry]);
  } else {
    debug('using local registry');
    const fallbackRegistry = new FallbackRegistry([...additionalRegistries, localRegistry, ...onChainRegistries]);

    // for some reason the promises checker really doesn't like the next line
    // eslint-disable-next-line
    fallbackRegistry.on('getPackageUrl', async (event) => {
      // if we had to load this package from the on-chain registry and it was immutable, record
      if (event.result.mutability === 'version' && event.registry instanceof OnChainRegistry) {
        debug('caching immutable package from on-chain registry', event.fullPackageRef);
        await localRegistry.publish(event.fullPackageRef, event.chainId, event.result.url, '', 'version');
      }
    });

    return fallbackRegistry;
  }
}

export async function createDryRunRegistry(cliSettings: CliSettings): Promise<FallbackRegistry> {
  return createDefaultReadRegistry(cliSettings, [new InMemoryRegistry()]);
}
