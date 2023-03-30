import { ContractArtifact } from '@usecannon/builder';
import { subtask } from 'hardhat/config';

import { SUBTASK_GET_ARTIFACT } from '../task-names';

subtask(SUBTASK_GET_ARTIFACT).setAction(async ({ name }, hre): Promise<ContractArtifact> => {
  const art = (await hre.artifacts.readArtifact(name)) as ContractArtifact;
  if (art) {
    const buildInfo = await hre.artifacts.getBuildInfo(`${art.sourceName}:${art.contractName}`);
    art.source = {
      solcVersion: buildInfo!.solcLongVersion,
      input: JSON.stringify(buildInfo!.input),
    };
  }

  return art;
});
