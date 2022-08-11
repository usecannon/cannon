import _ from 'lodash';
import os from 'os';
import path from 'node:path';
import ethers from 'ethers';
import { table } from 'table';
import { bold, greenBright, green, dim } from 'chalk';
import { ChainBuilder, ContractArtifact } from '@usecannon/builder';
import { setupAnvil, loadCannonfile } from '../helpers';
import { runRpc, getProvider } from '../rpc';
import { PackageSettings } from '../types';
import { printChainBuilderOutput } from '../util/printer';

interface Params {
  cannonfilePath: string;
  settings: PackageSettings;
  getArtifact: (name: string) => Promise<ContractArtifact>;
  cannonDirectory: string;
  projectDirectory: string;
  preset?: string;
}

export async function build({
  cannonfilePath,
  settings,
  getArtifact,
  cannonDirectory,
  projectDirectory,
  preset = 'main',
}: Params) {
  await setupAnvil();

  const def = loadCannonfile(cannonfilePath);

  const { name, version } = def;

  const anvilInstance = await runRpc({
    port: 8545,
  });
  const provider = await getProvider(anvilInstance);

  const builder = new ChainBuilder({
    name,
    version,
    def,
    preset,

    readMode: 'all',
    writeMode: 'all',

    provider,
    chainId: 31337,
    baseDir: projectDirectory,
    savedPackagesDir: cannonDirectory,
    async getSigner(addr: string) {
      // on test network any user can be conjured
      await provider.send('hardhat_impersonateAccount', [addr]);
      await provider.send('hardhat_setBalance', [addr, ethers.utils.parseEther('10000').toHexString()]);
      return provider.getSigner(addr);
    },
    getArtifact,
  });

  const outputs = await builder.build(settings);

  printChainBuilderOutput(outputs);

  console.log(greenBright(`Successfully built package ${bold(`${name}:${version}`)} to ${bold(cannonDirectory)}`));

  // TODO: Update logging
  // Run this on a local node with <command>
  // Deploy it to a remote network with <command>
  // Publish your package to the registry with <command>

  anvilInstance.kill();

  return outputs;
}
