import fs from 'fs-extra';
import path from 'path';
import { subtask } from 'hardhat/config';

import { SUBTASK_WRITE_DEPLOYMENTS } from '../task-names';
import { BundledChainBuilderOutputs } from '../builder';
import { printBundledChainBuilderOutput } from '../printer';
import { any } from 'hardhat/internal/core/params/argumentTypes';

subtask(SUBTASK_WRITE_DEPLOYMENTS)
  .addParam('outputs', 'Output object from the chain builder', null, any)
  .addOptionalParam('modules', 'Which modules to output deployments for. Comma separated (default: `self`)', 'self')
  .setAction(async ({ outputs, modules }: { outputs: BundledChainBuilderOutputs; modules: string }, hre): Promise<void> => {
    const deploymentPath = path.resolve(hre.config.paths.deployments, hre.network.name);

    await fs.mkdirp(deploymentPath);

    // find all contract deployment addresses for the selected modules and put them in a file
    for (const module of modules.split(',')) {
      for (const contract in outputs[module].contracts) {
        const file = path.join(deploymentPath, `${contract}.json`);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const contractOutputs = outputs[module].contracts![contract];

        const transformedOutput = {
          ...contractOutputs,
          abi: JSON.parse(contractOutputs.abi as string),
        };

        // JSON format is already correct, so we can just output what we have
        await fs.writeFile(file, JSON.stringify(transformedOutput, null, 2));
      }
    }

    // neatly print also
    printBundledChainBuilderOutput(outputs);

    console.log('wrote deployment artifacts:', deploymentPath);
  });
