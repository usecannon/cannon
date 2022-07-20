import { ChainBuilder } from '@usecannon/builder';
import { InvalidArgumentError } from 'commander';
import { ethers } from 'ethers';
import { findPackage } from '../helpers';
import { PackageDefinition } from '../types';

interface Params {
  packageDefinition: PackageDefinition;
  cannonDirectory: string;
  projectDirectory: string;
  networkRpc: string;
  privateKey: string;
  preset: string;
  dryRun: boolean;
}

export async function deploy({
  packageDefinition,
  cannonDirectory,
  projectDirectory,
  networkRpc,
  privateKey,
  preset,
  dryRun,
}: Params) {
  const { def } = findPackage(cannonDirectory, packageDefinition.name, packageDefinition.version);

  if (dryRun) {
    throw new InvalidArgumentError('--dry-run param not implemented yet');
  }

  const provider = new ethers.providers.JsonRpcProvider(networkRpc);
  const { chainId } = await provider.getNetwork();
  const signer = new ethers.Wallet(privateKey, provider);

  const getSigner = async (addr: string) => {
    throw new Error(`Looking for signer: ${addr}`);
  };

  // TODO Add validation of settings (should not allow to put unexistant settings, values, etc)

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

  console.log(outputs);

  // TODO save deployment json files!

  return outputs;
}
