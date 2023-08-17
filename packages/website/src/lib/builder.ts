// Extracted builder getOutput from ipfs logic

import { ChainArtifacts, ChainDefinition } from '@usecannon/builder';
import _ from 'lodash';

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
