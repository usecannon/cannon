// Extracted builder getOutput from ipfs logic
import { ChainDefinition, ChainArtifacts, registerAction, DeploymentInfo } from '@usecannon/builder';
import _ from 'lodash';
import { z } from 'zod';

registerAction({
  label: 'run',

  configInject: () => null,

  getState: async () => null,
  exec: async () => ({ imports: {}, contracts: {}, txns: {}, extras: {} }),
  validate: z.any(),
});

export const getOutput = (deploymentInfo: DeploymentInfo): ChainArtifacts => {
  const { state, def } = deploymentInfo;
  // for some reason, we can use workers here since it failed.
  const chainDefinition = new ChainDefinition(def);

  const artifacts: ChainArtifacts = {};

  for (const step of chainDefinition.topologicalActions) {
    if (state[step] && state[step].artifacts) {
      _.merge(artifacts, state[step].artifacts);
    }
  }
  return artifacts;
};
