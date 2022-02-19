import { task } from 'hardhat/config';

import { CannonDeploy } from '../types';
import { ChainBuilder } from '../builder';
import { SUBTASK_CANNON_LOAD_DEPLOY, TASK_CANNON } from '../task-names';
import { printBundledChainBuilderOutput } from '../printer';

task(TASK_CANNON, 'Provision the current deploy.json file using Cannon')
  .addOptionalParam('file', 'Custom cannon deployment file.', 'cannon.json')
  .setAction(async ({ file }, hre) => {
    const deploy = (await hre.run(SUBTASK_CANNON_LOAD_DEPLOY, {
      file,
    })) as CannonDeploy;

    for (const chainData of deploy.chains) {
      for (const provision of chainData.deploy) {
        console.log('deploy a chain part');
        let builder;
        if (typeof provision == 'string') {
          const [name, version] = provision.split(':');
          builder = new ChainBuilder({ name, version, hre });
          await builder.build({});
        } else {
          const [name, version] = provision[0].split(':');
          builder = new ChainBuilder({ name, version, hre });
          await builder.build(provision[1]);
        }

        console.log(
          `${typeof provision == 'string' ? provision : provision[0]} outputs:`
        );
        printBundledChainBuilderOutput(builder.getOutputs());

        /*const [repository, tag = 'latest'] = image.split(':');
        const ipfsHash = await registry.get(repository, tag);

        if (!ipfsHash) {
          throw new HardhatPluginError(
            'cannon',
            `Image "${image}" not found on the registry`
          );
        }*/
      }

      await hre.run('node');
    }

    /*const registry = new CannonRegistry();

    for (const chainData of deploy.chains) {
      for (const image of chainData.deploy) {
        const [repository, tag = 'latest'] = image.split(':');
        const ipfsHash = await registry.get(repository, tag);

        if (!ipfsHash) {
          throw new HardhatPluginError(
            'cannon',
            `Image "${image}" not found on the registry`
          );
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(deploy, null, 2));*/
  });
