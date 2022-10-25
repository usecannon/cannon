import path from 'path';
import { existsSync } from 'fs-extra';
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
  packagesDir?: string
) {
  packagesDir = packagesDir || getSavedPackagesDir();

  const [name, tag] = pkg.split(':');

  const depdir = path.dirname(
    getActionFiles(getPackageDir(packagesDir, name, tag), chainId, preset || 'main', 'sample').basename
  );

  if (!existsSync(depdir)) {
    await registry.downloadPackageChain(pkg, chainId, preset || 'main', packagesDir);

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
}

// nodejs version check
if (!semver.satisfies(process.version, pkg.engines.node)) {
  throw new Error(`Cannon requires Node.js ${pkg.engines.node} but your current version is ${process.version}`);
}

// TODO:
// Supply provider in build step (remove from constructor)
// getSigner can be optional on constructor
// add getOutputs to builder lib (maybe)
// remove provider from getOutputs
// change it so the getOutputs returns null if file not found

import { getProvider, runRpc } from '../rpc';
export async function getOutputs(presetData: any, chainId: number) {
  // We need to use the builder to re-create the contract addresses
  const def = presetData.def;

  const node = await runRpc({
    port: 8545,
    forkUrl: '',
  });
  const provider = await getProvider(node);

  const builder = new ChainBuilder({
    name: def.name,
    version: def.version,
    def,
    provider,
    chainId,
    async getSigner(addr: string) {
      return provider.getSigner(addr);
    },
  });

  const outputs = await builder.getOutputs();

  await node.kill();

  return outputs;
}
