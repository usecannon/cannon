import path from 'node:path';
import { ChainBuilder } from '@usecannon/builder';
import { green } from 'chalk';
import { InvalidArgumentError } from 'commander';
import { ethers } from 'ethers';
import { findPackage } from '../helpers';
import { PackageDefinition } from '../types';
import { printChainBuilderOutput } from '../util/printer';
import { writeModuleDeployments } from '../util/write-deployments';

interface Params {
  packageDefinition: PackageDefinition;
  cannonDirectory: string;
  projectDirectory: string;
  networkRpc: string;
  privateKey: string;
  preset: string;
  dryRun: boolean;
  deploymentPath: string;
  prefix?: string;
}

export async function deploy({
  packageDefinition,
  cannonDirectory,
  projectDirectory,
  networkRpc,
  privateKey,
  preset,
  dryRun,
  deploymentPath,
  prefix = '',
}: Params) {
  const { def } = findPackage(cannonDirectory, packageDefinition.name, packageDefinition.version);

  const provider = new ethers.providers.JsonRpcProvider(networkRpc);
  const { chainId } = await provider.getNetwork();
  const signer = new ethers.Wallet(privateKey, provider);

  const getSigner = (addr: string) => {
    if (addr !== signer.address) {
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
    writeMode: 'metadata',

    provider,
    chainId,
    baseDir: projectDirectory,
    savedPackagesDir: cannonDirectory,
    getSigner,
    getDefaultSigner: () => Promise.resolve(signer),
  });

  const outputs = await builder.build(packageDefinition.settings);

  console.log(green(`Writing deployment artifacts to ./${path.relative(process.cwd(), deploymentPath)}\n`));

  await writeModuleDeployments(deploymentPath, prefix, outputs);

  printChainBuilderOutput(outputs);

  return outputs;
}
