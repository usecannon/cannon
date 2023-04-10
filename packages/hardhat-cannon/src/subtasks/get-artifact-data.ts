import { ContractArtifact } from '@usecannon/builder';
import { subtask } from 'hardhat/config';

import { SUBTASK_GET_ARTIFACT } from '../task-names';

subtask(SUBTASK_GET_ARTIFACT).setAction(async ({ name }, hre): Promise<ContractArtifact> => {
  const art = (await hre.artifacts.readArtifact(name)) as ContractArtifact;
  if (art) {
  
    const dependencyGraph: any = await hre.run(
      'compile:solidity:get-dependency-graph',
      { sourceNames: [art.sourceName] }
    );
  
    const resolvedFile = dependencyGraph.getResolvedFiles()[0];
  
    const compileJob = await hre.run('compile:solidity:get-compilation-job-for-file', { file: resolvedFile, dependencyGraph });
  
    const solidityInput = await hre.run('compile:solidity:get-compiler-input', { compilationJob: compileJob });

    const buildInfo = await hre.artifacts.getBuildInfo(`${art.sourceName}:${art.contractName}`);
    art.source = {
      solcVersion: buildInfo!.solcLongVersion,
      input: JSON.stringify(solidityInput),
    };
  }

  return art;
});
