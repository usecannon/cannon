import _ from 'lodash';
import { task } from 'hardhat/config';

import { CannonDeploy } from '../../types';
import { ChainBuilder } from '../builder';
import { SUBTASK_DOWNLOAD, SUBTASK_LOAD_DEPLOY, SUBTASK_WRITE_DEPLOYMENTS, TASK_CANNON } from '../task-names';

task(TASK_CANNON, 'Provision the current cannon.json file using Cannon')
  .addOptionalParam('file', 'Custom cannon deployment file.', 'cannon.json')
  .addOptionalPositionalParam('label', 'Label of a chain to load')
  .addOptionalVariadicPositionalParam('opts', 'Settings to use for execution', [])
  .setAction(async ({ file, label, opts }, hre) => {
    let deploy: CannonDeploy | null = null;

    if (label) {
      const options = _.fromPairs(opts.map((o: string) => o.split('=')));

      deploy = {
        name: label,
        chains: [
          {
            deploy: [[label as string, options as any]],
          },
        ],
      };
    } else {
      deploy = (await hre.run(SUBTASK_LOAD_DEPLOY, {
        file,
      })) as CannonDeploy;
    }

    if (!deploy) {
      throw new Error('Deploy configuration not found.');
    }

    // TODO: implement multi chain compatibility (we're going to wait until hardhat
    // has this functionality upstreamed).
    for (const chainData of deploy.chains) {
      for (const provision of chainData.deploy) {
        const image = typeof provision == 'string' ? provision : provision[0];
        const options = typeof provision == 'string' ? {} : provision[1] ?? {};
        const [name, version] = image.split(':');

        await hre.run(SUBTASK_DOWNLOAD, { images: [image] });
        const builder = new ChainBuilder({ name, version, hre });
        await builder.build(options);

        await hre.run(SUBTASK_WRITE_DEPLOYMENTS, {
          outputs: builder.getOutputs(),
        });
      }

      await hre.run('node');
    }
  });
