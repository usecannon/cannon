import { ethers } from 'ethers';
import path from 'path';
import { existsSync } from 'fs-extra';
import { ChainBuilder } from './builder';
import { CannonRegistry } from './registry';
import { getSavedChartsDir, getActionFiles, getChartDir } from './storage';

export { ChainBuilder, Events } from './builder';

export { ChainBuilderContext, ChainArtifacts, validateChainDefinition } from './types';

export * from './storage';

export { CannonRegistry } from './registry';

export async function downloadPackagesRecursive(
  pkg: string,
  chainId: number,
  preset: string | null,
  registry: CannonRegistry,
  chartsDir?: string
) {
  chartsDir = chartsDir || getSavedChartsDir();

  const [name, tag] = pkg.split(':');

  const depdir = path.dirname(
    getActionFiles(getChartDir(chartsDir, name, tag), chainId, preset || 'main', 'sample').basename
  );

  if (!existsSync(depdir)) {
    await registry.downloadPackageChain(pkg, chainId, preset || 'main', chartsDir);

    const builder = new ChainBuilder({
      name,
      version: tag,
      writeMode: 'none',
      readMode: 'none',
      provider: null as unknown as ethers.providers.JsonRpcProvider, // TODO provider shouldn't be required here
      getSigner: async () => {
        throw new Error('signer should be unused');
      },
      chainId: chainId,
      savedChartsDir: chartsDir,
    });

    const dependencies = await builder.getDependencies({});

    for (const dependency of dependencies) {
      await downloadPackagesRecursive(dependency.source, dependency.chainId, dependency.preset, registry, chartsDir);
    }
  }
}
