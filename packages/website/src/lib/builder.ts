// Extracted builder getOutput from ipfs logic

import { getChainDefinitionFromWorker } from '@/helpers/chain-definition';
import { ChainDefinition, ChainArtifacts, registerAction, DeploymentInfo } from '@usecannon/builder';
import _ from 'lodash';
import { z } from 'zod';

registerAction({
  label: 'run',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  configInject: () => null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  getState: async () => null,
  exec: async () => ({ imports: {}, contracts: {}, txns: {}, extras: {} }),
  validate: z.any(),
});

export const getOutput = async (deploymentInfo: DeploymentInfo): Promise<ChainArtifacts> => {
  const { state, def } = deploymentInfo;
  const chainDefinition = await getChainDefinitionFromWorker(def);
  const artifacts: ChainArtifacts = {};

  for (const step of chainDefinition.topologicalActions) {
    if (state[step] && state[step].artifacts) {
      _.merge(artifacts, state[step].artifacts);
    }
  }
  return artifacts;
};
