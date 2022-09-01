import { resolve } from 'path';
import { URL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import _ from 'lodash';
import fs from 'fs-extra';
import { ethers } from 'ethers';
import { table } from 'table';
import { bold, greenBright, green, dim, magentaBright } from 'chalk';
import { ChainBuilder, ContractArtifact, downloadPackagesRecursive, Events } from '@usecannon/builder';
import { loadCannonfile } from '../helpers';
import { runRpc, getProvider } from '../rpc';
import { PackageSettings } from '../types';
import { printChainBuilderOutput } from '../util/printer';
import { writeModuleDeployments } from '../util/write-deployments';
import createRegistry from '../registry';

interface Params {
  cannonfilePath: string;
  settings: PackageSettings;
  getArtifact: (name: string) => Promise<ContractArtifact>;
  cannonDirectory: string;
  projectDirectory: string;
  preset?: string;
  writeDeployments?: string;
  registryIpfsUrl: string;
  registryRpcUrl: string;
  registryAddress: string;
}

export async function build({
  cannonfilePath,
  settings,
  getArtifact,
  cannonDirectory,
  projectDirectory,
  writeDeployments,
  preset = 'main',
  registryIpfsUrl,
  registryRpcUrl,
  registryAddress,
}: Params) {
  const { def, name, version } = loadCannonfile(cannonfilePath);

  if (!version) {
    throw new Error(`Missing "version" definition on ${cannonfilePath}`);
  }

  const defSettings = def.getSettings();
  if (!settings && defSettings && !_.isEmpty(defSettings)) {
    const displaySettings = Object.entries(defSettings).map((setting) => [
      setting[0],
      setting[1].defaultValue || dim('No default value'),
      setting[1].description || dim('No description'),
    ]);
    console.log('This package can be built with custom settings.');
    console.log(dim(`Example: npx hardhat cannon:build ${displaySettings[0][0]}="my ${displaySettings[0][0]}"`));
    console.log('\nSETTINGS:');
    console.log(table([[bold('Name'), bold('Default Value'), bold('Description')], ...displaySettings]));
  }

  if (!_.isEmpty(settings)) {
    console.log(
      green(
        `Creating preset ${bold(preset)} with the following settings: ` +
          Object.entries(settings)
            .map((setting) => `${setting[0]}=${setting[1]}`)
            .join(' ')
      )
    );
  }

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

  const registry = createRegistry({
    registryAddress: registryAddress,
    registryRpc: registryRpcUrl,
    ipfsUrl: registryIpfsUrl,
  });

  const dependencies = await builder.def.getRequiredImports(await builder.populateSettings(settings));

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

  const outputs = await builder.build(settings);

  if (writeDeployments) {
    console.log(magentaBright(`Writing deployment data to ${writeDeployments}...`));
    const path = resolve(writeDeployments);
    await fs.mkdirp(path);
    await writeModuleDeployments(writeDeployments, '', outputs);
  }

  printChainBuilderOutput(outputs);

  const homeDir = os.homedir() + path.sep;
  const prettyDir = cannonDirectory.replace(new RegExp(`^${homeDir}`), `~${path.sep}`);

  console.log(greenBright(`Successfully built package ${bold(`${name}:${version}`)} to ${bold(prettyDir)}`));

  // TODO: Update logging
  // Run this on a local node with <command>
  // Deploy it to a remote network with <command>
  // Publish your package to the registry with <command>

  anvilInstance.kill();

  return outputs;
}
