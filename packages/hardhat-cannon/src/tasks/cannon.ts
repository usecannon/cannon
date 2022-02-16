import { task } from 'hardhat/config';
import { HardhatPluginError } from 'hardhat/plugins';
import { SUBTASK_CANNON_LOAD_DEPLOY, TASK_CANNON } from '../task-names';
import { CannonDeploy } from '../types';
import CannonRegistry from '../builder/registry';

task(TASK_CANNON, 'Provision the current deploy.json file using Cannon')
  .addOptionalParam('file', 'Custom cannon deployment file.', 'deploy.json')
  .setAction(async ({ file }, hre) => {
    const registry = new CannonRegistry();

    const deploy = await hre.run(SUBTASK_CANNON_LOAD_DEPLOY, { file }) as CannonDeploy;

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
    console.log(JSON.stringify(deploy, null, 2));
  });
