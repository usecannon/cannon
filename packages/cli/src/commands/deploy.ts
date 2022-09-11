import path from 'node:path';
import { ChainBuilder, downloadPackagesRecursive, Events } from '@usecannon/builder';
import { green } from 'chalk';
import { ethers } from 'ethers';
import { findPackage } from '../helpers';
import { PackageDefinition } from '../types';
import { printChainBuilderOutput } from '../util/printer';
import { writeModuleDeployments } from '../util/write-deployments';
import createRegistry from '../registry';

interface Params {
  packageDefinition: PackageDefinition;
  cannonDirectory: string;
  projectDirectory: string;
  signer: ethers.Signer;
  provider: ethers.providers.JsonRpcProvider;
  preset: string;
  dryRun: boolean;
  deploymentPath: string;
  prefix?: string;
  registryIpfsUrl: string;
  registryRpcUrl: string;
  registryAddress: string;
}

export async function deploy({
  packageDefinition,
  cannonDirectory,
  projectDirectory,
  signer,
  provider,
  preset,
  dryRun,
  deploymentPath,
  prefix = '',
  registryAddress,
  registryRpcUrl,
  registryIpfsUrl,
}: Params) {
  const { def } = findPackage(cannonDirectory, packageDefinition.name, packageDefinition.version);
  const { chainId } = await provider.getNetwork();
  const signerAddress = await signer.getAddress();

  const getSigner = (addr: string) => {
    if (addr !== signerAddress) {
      throw new Error(`Looking for a signer different that the one configured: ${addr}`);
    }

    return Promise.resolve(signer);
  };

  const builder = new ChainBuilder({
    name: packageDefinition.name,
    version: packageDefinition.version,
    def,
    preset,

    readMode: 'metadata',
    writeMode: dryRun ? 'none' : 'metadata',

    provider,
    chainId,
    baseDir: projectDirectory,
    savedPackagesDir: cannonDirectory,
    getSigner,
    getDefaultSigner: () => Promise.resolve(signer),
  });

  const registry = createRegistry({
    registryAddress: registryAddress,
    registryRpc: registryRpcUrl,
    ipfsUrl: registryIpfsUrl,
  });

  const dependencies = await builder.def.getRequiredImports(await builder.populateSettings(packageDefinition.settings));

  for (const dependency of dependencies) {
    console.log(`Loading dependency tree ${dependency.source} (${dependency.chainId}-${dependency.preset})`);
    await downloadPackagesRecursive(
      dependency.source,
      dependency.chainId,
      dependency.preset,
      registry,
      builder.provider,
      builder.packagesDir
    );
  }

  builder.on(Events.PreStepExecute, (t, n) => console.log(`\nexec: ${t}.${n}`));
  builder.on(Events.DeployContract, (n, c) => console.log(`deployed contract ${n} (${c.address})`));
  builder.on(Events.DeployTxn, (n, t) => console.log(`ran txn ${n} (${t.hash})`));

  const outputs = await builder.build(packageDefinition.settings);

  if (deploymentPath) {
    let relativePath = path.relative(process.cwd(), deploymentPath);
    if (!relativePath.startsWith('/')) {
      relativePath = './' + relativePath;
    }
    console.log(green(`Writing deployment artifacts to ${relativePath}\n`));
    await writeModuleDeployments(deploymentPath, prefix, outputs);
  }

  printChainBuilderOutput(outputs);

  return { outputs };
}
