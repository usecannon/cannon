import _ from 'lodash';
import path from 'path';
import { task } from 'hardhat/config';
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names';

import loadCannonfile from '../internal/load-cannonfile';
import { ChainBuilder } from '../builder';
import { SUBTASK_DOWNLOAD, SUBTASK_WRITE_DEPLOYMENTS, TASK_BUILD } from '../task-names';
import { printChainBuilderOutput } from '../printer';

task(TASK_BUILD, 'Assemble a defined chain and save it to to a state which can be used later')
  .addFlag('noCompile', 'Do not execute hardhat compile before build')
  .addOptionalParam('file', 'TOML definition of the chain to assemble', 'cannonfile.toml')
  .addOptionalVariadicPositionalParam('options', 'Key values of chain which should be built')
  .setAction(async ({ noCompile, file, options }, hre) => {
    if (!noCompile) {
      await hre.run(TASK_COMPILE);
    }

    const filepath = path.resolve(hre.config.paths.root, file);

    console.log('Building cannonfile: ', path.relative(process.cwd(), filepath));

    const def = loadCannonfile(hre, filepath);
    const { name, version } = def;

    const builder = new ChainBuilder({ name, version, hre, def });
    const dependencies = builder.getDependencies();

    if (dependencies.length > 0) {
      await hre.run(SUBTASK_DOWNLOAD, { images: dependencies });
    }

    // options can be passed through commandline, or environment
    const mappedOptions: { [key: string]: string } = _.fromPairs((options || []).map((kv: string) => kv.split('=')));

    await builder.build(mappedOptions);

    printChainBuilderOutput(builder.getOutputs());

    await hre.run(SUBTASK_WRITE_DEPLOYMENTS, {
      outputs: builder.getOutputs(),
    });

    return {
      filepath,
      builder,
    };
  });
