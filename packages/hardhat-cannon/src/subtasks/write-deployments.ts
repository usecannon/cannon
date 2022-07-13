import fs from 'fs-extra';
import path from 'path';
import { subtask } from 'hardhat/config';

import { SUBTASK_WRITE_DEPLOYMENTS } from '../task-names';
import { printChainBuilderOutput } from '../printer';
import { any } from 'hardhat/internal/core/params/argumentTypes';
import { ChainBuilderContext, ChainArtifacts } from '@usecannon/builder';

subtask(SUBTASK_WRITE_DEPLOYMENTS)
  .addParam('outputs', 'Output object from the chain builder', null, any)
  .addOptionalParam('prefix', 'Prefix deployments with a name (default: empty)', '')
  .setAction(async ({ outputs, prefix }: { outputs: ChainBuilderContext; prefix: string }, hre): Promise<void> => {
    const deploymentPath = path.resolve(hre.config.paths.deployments, hre.network.name);

    await fs.mkdirp(deploymentPath);

    console.log(`Writing deployment artifacts to ./${path.relative(process.cwd(), deploymentPath)}\n`);

    await writeModuleDeployments(deploymentPath, prefix, outputs);

    // neatly print also
    printChainBuilderOutput(outputs);
  });

/**
 * Recursively writes all deployments for a chainbuilder output
 */
async function writeModuleDeployments(deploymentPath: string, prefix: string, outputs: ChainArtifacts) {
  if (prefix) {
    prefix = prefix + '.';
  }

  for (const m in outputs.imports) {
    await writeModuleDeployments(deploymentPath, `${prefix}${m}`, outputs.imports[m]);
  }

  for (const contract in outputs.contracts) {
    const file = path.join(deploymentPath, `${prefix}${contract}.json`);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const contractOutputs = outputs.contracts![contract];

    const transformedOutput = {
      ...contractOutputs,
      abi: contractOutputs.abi,
    };

    // JSON format is already correct, so we can just output what we have
    await fs.writeFile(file, JSON.stringify(transformedOutput, null, 2));
  }
}
