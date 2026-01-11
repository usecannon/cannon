import { ContractArtifact } from '@usecannon/builder';
import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';

import fs from 'fs';

// purpose: for the extraction of artifact compilation data for use in hardhat-cannon
export default async function getArtifactData({ name }: { name: string }, hre: HardhatRuntimeEnvironment): Promise<ContractArtifact> {
  const art = (await hre.artifacts.readArtifact(name)) as ContractArtifact;
  if (art) {
    const buildInfoPath: any = await hre.artifacts.getBuildInfoPath(`${art.sourceName}:${art.contractName}`);

    const buildInfo = JSON.parse(await fs.promises.readFile(buildInfoPath, 'utf-8'));

    art.source = {
      solcVersion: buildInfo.solcLongVersion,
      input: JSON.stringify(buildInfo.input),
    };
  }

  return art;
}
