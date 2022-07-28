import _ from 'lodash';
import os from 'os';
import path from 'node:path';
import ethers from 'ethers';
import { table } from 'table';
import { bold, greenBright, green, dim } from 'chalk';
import { ChainBuilder, ContractArtifact } from '@usecannon/builder';
import { setupAnvil, loadCannonfile } from '../helpers';
import { runRpc, getProvider } from '../rpc';

export async function build(
  cannonfilePath: string,
  getArtifact: (name: string) => Promise<ContractArtifact>,
  preset = 'main',
  localCannonDirectory?: string,
  baseProjectDirectory?: string
) {
  await setupAnvil();

  const def = loadCannonfile(cannonfilePath);

  if (!localCannonDirectory) {
    localCannonDirectory = path.join(os.homedir(), '.local', 'cannon');
  }

  if (!baseProjectDirectory) {
    baseProjectDirectory = path.dirname(cannonfilePath);
  }

  // if (!settings && !_.isEmpty(def.setting)) {
  //   const displaySettings = Object.entries(def.setting).map((setting: Array<any>) => [
  //     setting[0],
  //     setting[1].defaultValue || dim('No default value'),
  //     setting[1].description || dim('No description'),
  //   ]);

  //   console.log('This package can be built with custom settings.');
  //   console.log(dim(`Example: npx hardhat cannon:build ${displaySettings[0][0]}="my ${displaySettings[0][0]}"`));
  //   console.log('\nSETTINGS:');
  //   displaySettings.unshift([bold('Name'), bold('Default Value'), bold('Description')]);
  //   console.log(table(displaySettings));
  // }

  // options can be passed through commandline, or environment
  // const mappedSettings: { [key: string]: string } = _.fromPairs((settings || []).map((kv: string) => kv.split('=')));

  // if (!_.isEmpty(mappedSettings)) {
  //   console.log(
  //     green(
  //       `Creating preset ${bold(preset)} with the following settings: ` +
  //         Object.entries(mappedSettings)
  //           .map((setting) => `${setting[0]}=${setting[1]}`)
  //           .join(' ')
  //     )
  //   );
  // }

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
    baseDir: baseProjectDirectory,
    savedPackagesDir: localCannonDirectory,
    async getSigner(addr: string) {
      // on test network any user can be conjured
      await provider.send('hardhat_impersonateAccount', [addr]);
      await provider.send('hardhat_setBalance', [addr, ethers.utils.parseEther('10000').toHexString()]);
      return provider.getSigner(addr);
    },
    getArtifact,
  });

  const outputs = await builder.build({});

  // TODO: Update outputs logging

  console.log(greenBright(`Successfully built package ${bold(`${name}:${version}`)} to ${bold(localCannonDirectory)}`));

  // TODO: Update logging
  // Run this on a local node with <command>
  // Deploy it to a remote network with <command>
  // Publish your package to the registry with <command>
}
