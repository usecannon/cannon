import path from 'path';
import { ChainDefinition } from './definition';
import { CannonRegistry } from './registry';
import { getSavedPackagesDir, getActionFiles, getPackageDir, getAllDeploymentInfos } from './storage';

import semver from 'semver';

import pkg from '../package.json';
import { CannonWrapperGenericProvider } from './error/provider';

export { RawChainDefinition, ChainDefinition, validateChainDefinition } from './definition';
export { ChainBuilder, Events } from './builder';

export * from './types';

export * from './storage';

export { CannonWrapperGenericProvider } from './error/provider';

export { handleTxnError } from './error';

export { CannonRegistry, ReadOnlyCannonRegistry } from './registry';

export { CANNON_CHAIN_ID } from './constants';

export async function downloadPackagesRecursive(
  pkg: string,
  chainId: number,
  preset: string | null,
  registry: CannonRegistry,
  provider: CannonWrapperGenericProvider,
  packagesDir?: string,
  checkLatest = false
) {
  packagesDir = packagesDir || getSavedPackagesDir();

  const [name, tag] = pkg.split(':');

  const depdir = path.dirname(
    getActionFiles(getPackageDir(packagesDir, name, tag), chainId, preset || 'main', 'sample').basename
  );

  await registry.downloadFullPackage(pkg, packagesDir, checkLatest);

  const info = await getAllDeploymentInfos(depdir);

  const def = new ChainDefinition(info.def);

  const dependencies = def.getRequiredImports({
    package: info.npmPackage,
    chainId,

    timestamp: '0',
    settings: {},

    contracts: {},
    txns: {},
    imports: {},
    invokes: {},
  });

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

// nodejs version check
if (!semver.satisfies(process.version, pkg.engines.node)) {
  throw new Error(`Cannon requires Node.js ${pkg.engines.node} but your current version is ${process.version}`);
}
