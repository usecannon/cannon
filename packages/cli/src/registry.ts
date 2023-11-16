import { CannonRegistry, OnChainRegistry, InMemoryRegistry, FallbackRegistry } from '@usecannon/builder';
import _ from 'lodash';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import Debug from 'debug';
import { yellowBright } from 'chalk';

import { CliSettings } from './settings';
import { resolveRegistryProvider } from './util/provider';
import { isConnectedToInternet } from './util/is-connected-to-internet';
import { PKG_REG_EXP } from '@usecannon/builder';
import { PackageReference } from '@usecannon/builder/src';

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
    const {name, version, preset} = new PackageReference(packageRef);
    const variant = `${chainId}-${preset}`;

    return path.join(this.packagesDir, 'tags', `${name}_${version}_${variant}.txt`);
  }

  getMetaTagReferenceStorage(packageRef: string, chainId: number): string {
    const {name, version, preset} = new PackageReference(packageRef);
    const variant = `${chainId}-${preset}`;

    return path.join(this.packagesDir, 'tags', `${name}_${version}_${variant}.txt.meta`);
  }

  async getUrl(packageRef: string, chainId: number): Promise<string | null> {
    const {name, version, preset, fullPackageRef} = new PackageReference(packageRef);

    const baseResolved = await super.getUrl(fullPackageRef, chainId);
    if (baseResolved) {
      return baseResolved;
    }

    debug(
      'load local package link',
      packageRef,
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
    const {fullPackageRef} = new PackageReference(packageRef);

    try {
      debug(
        'load local meta package link',
        fullPackageRef,
        'at file',
        this.getMetaTagReferenceStorage(packageRef, chainId)
      );
      return (await fs.readFile(this.getMetaTagReferenceStorage(fullPackageRef, chainId))).toString().trim();
    } catch (err) {
      debug('could not load:', err);
      return null;
    }
  }

  async publish(packagesNames: string[], chainId: number, url: string, metaUrl: string): Promise<string[]> {
    for (const packageName of packagesNames) {
      const {fullPackageRef} = new PackageReference(packageName);
      debug('package local link', packageName);
      const file = this.getTagReferenceStorage(fullPackageRef, chainId);
      const metaFile = this.getMetaTagReferenceStorage(fullPackageRef, chainId);
      await fs.mkdirp(path.dirname(file));
      await fs.writeFile(file, url);
      await fs.writeFile(metaFile, metaUrl);
    }

    return [];
  }

  async scanDeploys(packageRef: string, chainId?: number): Promise<{ name: string; variant: string }[]> {
    const match = packageRef.match(PKG_REG_EXP);
    if (!match) {
      throw new Error(`Invalid package reference: ${packageRef}`);
    }

    const allTags = await fs.readdir(path.join(this.packagesDir, 'tags'));
    debug('scanning deploys in:', path.join(this.packagesDir, 'tags'), allTags);
    debug(`looking for ${packageRef}, ${chainId}`);

    return allTags
      .filter((t) => {
        if (!t.endsWith('.meta')) {
          const [tagName, tagVersion, tagVariant] = t.replace('.txt', '').split('_');
          const [tagChainId, tagPreset] = tagVariant.split('-');

          if (!tagVariant) {
            return false;
          }

          const { name: refName, version: refVersion, preset: refPreset } = match.groups!;

          // Package name must match, other properties must match if specified
          debug(`checking ${packageRef},${chainId} for a match with ${t}`);
          return (
            tagName == refName &&
            (!refVersion || tagVersion == refVersion) &&
            (!refPreset || tagPreset == refPreset) &&
            (!chainId || tagChainId == chainId.toString())
          );
        }
      })
      .map((t) => {
        const [name, version, tagVariant] = t.replace('.txt', '').split('_');
        return { name: `${name}:${version}`, variant: tagVariant };
      });
  }

  async getAllUrls(filterPackage: string, chainId: number): Promise<Set<string>> {
    if (!filterPackage) {
      return new Set();
    }
    const {name, version, preset} = new PackageReference(filterPackage);
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
