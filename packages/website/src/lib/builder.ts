// Extracted builder getOutput from ipfs logic

import { ChainArtifacts, ChainDefinition, registerAction } from '@usecannon/builder';
import _ from 'lodash';
import { z } from 'zod';

registerAction({
  label: 'run',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  configInject: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  getState: () => {},
  exec: async () => ({ imports: {}, contracts: {}, txns: {}, extras: {} }),
  validate: z.any(),
});

export const getOutput = (ipfs: { state: any; def: any }): ChainArtifacts => {
  const { state } = ipfs;
  const def = new ChainDefinition(ipfs.def);
  const artifacts: ChainArtifacts = {};
  for (const step of def.topologicalActions) {
    if (state[step] && state[step].artifacts) {
      _.merge(artifacts, state[step].artifacts);
    }
  }
  return artifacts;
};
