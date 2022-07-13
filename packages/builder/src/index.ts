import { ethers } from 'ethers';
import path from 'path';
import { existsSync } from 'fs-extra';
import { ChainBuilder } from './builder';
import { CannonRegistry } from './registry';
import { getSavedPackagesDir, getActionFiles, getPackageDir } from './storage';

import semver from 'semver';

import pkg from '../package.json';

export { ChainBuilder, Events } from './builder';

export * from './types';

export * from './storage';

export { CannonRegistry } from './registry';

export async function downloadPackagesRecursive(
  pkg: string,
  chainId: number,
  preset: string | null,
  registry: CannonRegistry,
  provider: ethers.providers.JsonRpcProvider,
  packagesDir?: string
) {
  packagesDir = packagesDir || getSavedPackagesDir();

  const [name, tag] = pkg.split(':');

  const depdir = path.dirname(
    getActionFiles(getPackageDir(packagesDir, name, tag), chainId, preset || 'main', 'sample').basename
  );

  if (!existsSync(depdir)) {
    await registry.downloadPackageChain(pkg, chainId, preset || 'main', packagesDir);

    const builder = new ChainBuilder({
      name,
      version: tag,
      writeMode: 'none',
      readMode: 'none',
      provider,
      getSigner: async () => {
        throw new Error('signer should be unused');
      },
      chainId: chainId,
      savedPackagesDir: packagesDir,
    });

    const dependencies = await builder.getDependencies({});

    for (const dependency of dependencies) {
      await downloadPackagesRecursive(
        dependency.source,
        dependency.chainId,
        dependency.preset,
        registry,
        provider,
        packagesDir
      );
    }
  }
}

// nodejs version check
if (!semver.satisfies(process.version, pkg.engines.node)) {
  throw new Error(`Cannon requires Node.js ${pkg.engines.node} but your current version is ${process.version}`);
}
