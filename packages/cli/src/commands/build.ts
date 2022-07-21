import _ from 'lodash';
import os from 'os';
import { resolve } from 'path';
import ethers from 'ethers';
import { setupAnvil, loadCannonfile } from '../helpers';
import { table } from 'table';
import { bold, green, dim } from 'chalk';
import { ChainBuilder } from '@usecannon/builder';
import { runRpc, getProvider } from '../rpc';

export async function build(
  cannonfile: string,
  preset: string,
  settings: JSON,
  getArtifact: Function,
  localCannonDirectory?: string,
  baseProjectDirectory?: string
) {
  await setupAnvil();

  const resolvedPath = resolve(cannonfile);
  const def = loadCannonfile(resolvedPath);

  if (!localCannonDirectory) {
    localCannonDirectory = os.homedir() + '/.local/cannon';
  }

  if (!baseProjectDirectory) {
    let pathParts = [...cannonfile.split('/')];
    pathParts.pop();
    baseProjectDirectory = pathParts.join('/');
  }

  if (!settings && !_.isEmpty(def.setting)) {
    let displaySettings = Object.entries(def.setting).map((setting: Array<any>) => {
      let settingRow: Array<any> = [
        setting[0],
        setting[1].defaultValue || dim('No default value'),
        setting[1].description || dim('No description'),
      ];
      return settingRow;
    });
    console.log('This package can be built with custom settings.');
    console.log(dim(`Example: npx hardhat cannon:build ${displaySettings[0][0]}="my ${displaySettings[0][0]}"`));
    console.log('\nSETTINGS:');
    displaySettings.unshift([bold('Name'), bold('Default Value'), bold('Description')]);
    console.log(table(displaySettings));
  }

  // options can be passed through commandline, or environment
  const mappedSettings: { [key: string]: string } = _.fromPairs((settings || []).map((kv: string) => kv.split('=')));

  if (!_.isEmpty(mappedSettings)) {
    console.log(
      green(
        `Creating preset ${bold(preset)} with the following settings: ` +
          Object.entries(mappedSettings)
            .map((setting) => `${setting[0]}=${setting[1]}`)
            .join(' ')
      )
    );
  }

  const { name, version } = def;

  let builder: ChainBuilder;
  const anvilInstance = await runRpc({
    port: 8545,
  });
  const provider = await getProvider(anvilInstance);

  builder = new ChainBuilder({
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
}
