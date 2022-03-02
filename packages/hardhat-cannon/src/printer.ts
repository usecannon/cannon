import _ from 'lodash';
import { table } from 'table';

import { BundledChainBuilderOutputs, ChainBuilderOutputs } from './builder';

export function printBundledChainBuilderOutput(output: BundledChainBuilderOutputs) {
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
    const formattedData = _.sortBy(
      _.flatten(
        _.map(output.runs, (v, runName) => {
          // prevent extremely long values from clogging the terminal
          const neatValues = _.map(v, (v, k) => [`${runName}.${k}`, `${ellipsize(v.toString(), 70)}`]);

          return neatValues;
        })
      ),
      '0'
    );

    console.log('RUN OUTPUTS:');
    console.log(table(formattedData));
  }
}

function ellipsize(str: string, maxLength: number, ellipsizeText = '...') {
  if (str.length > maxLength) {
    return str.substr(0, maxLength - ellipsizeText.length) + ellipsizeText;
  }

  return str;
}
