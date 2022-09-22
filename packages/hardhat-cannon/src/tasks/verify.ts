import { task } from 'hardhat/config';

import { TASK_VERIFY } from '../task-names';
import { CannonWrapperGenericProvider, ChainBuilder } from '@usecannon/builder';
import { DEFAULT_CANNON_DIRECTORY } from '@usecannon/cli';

task(TASK_VERIFY, 'Verify a package on Etherscan')
  .addPositionalParam('packageName', 'Name and version of the Cannon package to verify')
  .addOptionalParam('apiKey', 'Etherscan API key')
  .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .setAction(async ({ packageName, directory }, hre) => {
    if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
      directory = hre.config.paths.cannon;
    }

    const name = packageName.split(':')[0];
    const version = packageName.includes(':') ? packageName.split(':')[1] : 'latest';

    const builder = new ChainBuilder({
      name,
      version,
      readMode: 'metadata',
      chainId: (await hre.ethers.provider.getNetwork()).chainId,
      provider: new CannonWrapperGenericProvider({}, hre.ethers.provider),
      async getSigner(addr: string) {
        return hre.ethers.getSigner(addr);
      },
      savedPackagesDir: directory,
    });

    const outputs = await builder.getOutputs();

    if (!outputs) {
      throw new Error('No chain outputs found. Has the requested chain already been built?');
    }

    for (const c in outputs.contracts) {
      console.log('Verifying contract:', c);
      try {
        await hre.run('verify:verify', {
          contract: `${outputs.contracts[c].sourceName}:${outputs.contracts[c].contractName}`,
          address: outputs.contracts[c].address,
          constructorArguments: outputs.contracts[c].constructorArgs || [],
        });
      } catch (err) {
        if ((err as Error).message.includes('Already Verified')) {
          console.log('Already verified');
        } else {
          throw err;
        }
      }
    }
  });
