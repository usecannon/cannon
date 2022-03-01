import _ from 'lodash';
import { task } from 'hardhat/config';

import { CannonDeploy } from '../types';
import { ChainBuilder } from '../builder';
import {
  SUBTASK_DOWNLOAD,
  SUBTASK_LOAD_DEPLOY,
  SUBTASK_WRITE_DEPLOYMENTS,
  TASK_CANNON,
} from '../task-names';

task(TASK_CANNON, 'Provision the current cannon.json file using Cannon')
  .addOptionalParam('file', 'Custom cannon deployment file.')
  .addOptionalPositionalParam('label', 'Label of a chain to load')
  .addOptionalVariadicPositionalParam(
    'opts',
    'Settings to use for execution',
    []
  )
  .setAction(async ({ file, label, opts }, hre) => {
    let deploy: CannonDeploy | null = null;
    if (file) {
      deploy = (await hre.run(SUBTASK_LOAD_DEPLOY, {
        file,
      })) as CannonDeploy;
    } else if (label) {
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
      // TODO: read from cannonfile
    }

    for (const chainData of deploy!.chains) {
      for (const provision of chainData.deploy) {
        let builder;
        if (typeof provision == 'string') {
          const [name, version] = provision.split(':');
          await hre.run(SUBTASK_DOWNLOAD, { images: [provision] });
          builder = new ChainBuilder({ name, version, hre });
          await builder.build({});
        } else {
          const [name, version] = provision[0].split(':');
          await hre.run(SUBTASK_DOWNLOAD, { images: [provision[0]] });
          builder = new ChainBuilder({ name, version, hre });
          await builder.build(provision[1]);
        }

        await hre.run(SUBTASK_WRITE_DEPLOYMENTS, {
          outputs: builder.getOutputs(),
        });
      }

      await hre.run('node');
    }
  });
