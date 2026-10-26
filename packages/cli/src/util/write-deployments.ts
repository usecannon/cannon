import fs from 'node:fs/promises';
import path from 'path';
import { ChainArtifacts } from '@usecannon/builder';
import chalk from 'chalk';

import { log } from './console.js';

/**
 * Recursively writes all deployments for a chainbuilder output
 */
export async function writeModuleDeployments(deploymentPath: string, prefix: string, outputs: ChainArtifacts) {
  let relativePath = path.relative(process.cwd(), deploymentPath);
  if (!relativePath.startsWith('/')) {
    relativePath = './' + relativePath;
  }

  if (!prefix) log(chalk.green(`Writing deployment artifacts to ${relativePath}`));

  await fs.mkdir(deploymentPath, { recursive: true });

  if (prefix) {
    prefix += '.';
  }

  for (const m in outputs.imports) {
    await writeModuleDeployments(deploymentPath, `${prefix}${m}`, outputs.imports[m]);
  }

  for (const contract in outputs.contracts) {
    const file = path.join(deploymentPath, `${prefix}${contract}.json`);

    const contractOutputs = outputs.contracts![contract];

    const transformedOutput = {
      ...contractOutputs,
      abi: contractOutputs.abi,
    };

    // JSON format is already correct, so we can just output what we have
    await fs.writeFile(file, JSON.stringify(transformedOutput, null, 2));
  }
}
