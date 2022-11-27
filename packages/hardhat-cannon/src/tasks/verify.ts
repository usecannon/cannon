import _ from 'lodash';
import { task } from 'hardhat/config';
import prompts from 'prompts';
import { SUBTASK_LOAD_PACKAGE_DEFINITION, TASK_VERIFY } from '../task-names';
import { CannonWrapperGenericProvider, ChainBuilder } from '@usecannon/builder';
import { DEFAULT_CANNON_DIRECTORY, PackageDefinition } from '@usecannon/cli';

task(TASK_VERIFY, 'Verify a package on Etherscan')
  .addOptionalPositionalParam('packageName', 'Name and version of the Cannon package to verify')
  .addOptionalParam('apiKey', 'Etherscan API key')
  .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .setAction(async ({ packageName, directory, apiKey }, hre) => {
    if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
      directory = hre.config.paths.cannon;
    }

    const packageDefinition: PackageDefinition = await hre.run(SUBTASK_LOAD_PACKAGE_DEFINITION, { packageWithSettingsParams: packageName ? [packageName] : [] });

    const builder = new ChainBuilder({
      name: packageDefinition.name,
      version: packageDefinition.version,
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

    if (apiKey) {
      // @ts-ignore
      hre.config.etherscan.apiKey = apiKey;
    }
    // @ts-ignore
    if (!hre.config?.etherscan?.apiKey) {
      const response = await prompts({
        type: 'text',
        name: 'etherscan_apikey',
        message: 'Please enter an Etherscan API key',
      });
      // @ts-ignore
      hre.config.etherscan.apiKey = response.etherscan_apikey;
    }

    for (const c in outputs.contracts) {
      if (_.has(outputs, ['contracts', c, 'sourceName']) && _.has(outputs, ['contracts', c, 'contractName'])) {
        console.log('Verifying contract:', c);
        try {
          await hre.run('verify:verify', {
            contract: `${outputs.contracts[c].sourceName}:${outputs.contracts[c].contractName}`,
            address: outputs.contracts[c].address,
            constructorArguments: outputs.contracts[c].constructorArgs || [],
          });
        } catch (err) {
          console.log(
            `Unable to verify ${outputs.contracts[c].sourceName}:${outputs.contracts[c].contractName} - ${
              (err as Error).message
            }`
          );
        }
      } else {
        console.log(`Skipping ${c}: sourceName or contractName has not been set.`);
      }
    }
  });
