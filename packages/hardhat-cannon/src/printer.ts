import _ from 'lodash';
import { table } from 'table';

import { BundledChainBuilderOutputs, ChainBuilderOutputs } from './builder';

export function printBundledChainBuilderOutput(
  output: BundledChainBuilderOutputs
) {
  printChainBuilderOutput(output.self);

  console.log('====');

  for (const k in output) {
    if (k == 'self') {
      continue;
    }

    printChainBuilderOutput(output[k]);
  }
}

function printChainBuilderOutput(output: ChainBuilderOutputs) {
  if (output.contracts) {
    const formattedData = _.map(output.contracts, (v, k) => [k, v.address]);

    console.log('CONTRACTS:');
    console.log(table(formattedData));
  }

  if (output.runs) {
    const formattedData = _.map(output.runs, (v, k) => {
      const neatValues = _.map(v, (v, k) => `${k}: ${v}`);

      return [k, neatValues];
    });

    console.log('RUN OUTPUTS:');
    console.log(table(formattedData));
  }
}
