import _ from 'lodash';
import fs from 'fs-extra';
import toml from '@iarna/toml';
import { task } from 'hardhat/config';

import { ChainBuilder } from '../builder';
import { TASK_BUILD } from '../task-names';
import { printBundledChainBuilderOutput } from '../printer';

task(
  TASK_BUILD,
  'Assemble a defined chain and save it to to a state which can be used later'
)
  .addOptionalParam(
    'file',
    'TOML definition of the chain to assemble',
    'cannonfile.toml'
  )
  .addPositionalParam('label', 'Name of the image which is built')
  .addOptionalVariadicPositionalParam(
    'options',
    'Key values of chain which should be built'
  )
  .setAction(async ({ label, file, options }, hre) => {
    console.log('file', file);
    const def = toml.parse(fs.readFileSync(file).toString('utf8'));

    //console.log(JSON.stringify(def, null, 2));

    const builder = new ChainBuilder(label, hre, def);

    // options can be passed through commandline, or environment
    const mappedOptions: { [key: string]: string } = _.fromPairs(
      (options || []).map((kv: string) => kv.split('='))
    );

    await builder.build(mappedOptions);

    printBundledChainBuilderOutput(builder.getOutputs());

    // TEMP
    const greeter = await hre.ethers.getContractAt('Greeter', '0x5fbdb2315678afecb367f032d93f642f64180aa3');

    console.log(await greeter.greet());
  });
