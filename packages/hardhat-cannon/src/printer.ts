import _ from 'lodash';
import { table } from 'table';

import { ChainBuilderContext } from './builder/types';

export function printChainBuilderOutput(output: ChainBuilderContext) {
  if (output.contracts) {
    const formattedData = _.map(output.contracts, (v, k) => [k, v.address]);

    if (formattedData.length) {
      console.log('CONTRACTS:');
      console.log(table(formattedData));
    }
  }

  if (output.txns) {
    const formattedData = _.map(output.txns, (v, k) => [k, v.hash]);

    if (formattedData.length) {
      console.log('TRANSACTIONS:');
      console.log(table(formattedData));
    }
  }
}

/*function ellipsize(str: string, maxLength: number, ellipsizeText = '...') {
  if (str.length > maxLength) {
    return str.substr(0, maxLength - ellipsizeText.length) + ellipsizeText;
  }

  return str;
}*/
