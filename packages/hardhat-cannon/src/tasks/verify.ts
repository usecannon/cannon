import _ from 'lodash';
import { task } from 'hardhat/config';

import { TASK_VERIFY } from '../task-names';
import { ChainBuilder } from '../builder';
import loadCannonfile from '../internal/load-cannonfile';

task(TASK_VERIFY, 'Run etherscan verification on a cannon deployment sent to mainnet')
  .addOptionalPositionalParam('label', 'Label of a built cannon chain to verify on Etherscan')
  .addOptionalVariadicPositionalParam('opts', 'Settings used for execution', [])
  .setAction(async ({ label, opts }, hre) => {
    if (!label) {
      // load from base cannonfile
      const def = loadCannonfile(hre, hre.config.paths.root + '/cannonfile.toml');
      label = `${def.name}:${def.version}`;
    }

    console.log('Verifying cannon deployment', label);

    const [name, version] = label.split(':');

    // get the list of all deployed contracts
    const builder = new ChainBuilder({ name, version, hre, storageMode: 'none' });

    // TODO: prevent builder from taking any action here, it should
    // only be loading and validating everything
    const options: any = _.fromPairs(opts.map((o: string) => o.split('=')));
    await builder.build(options);
    const outputs = builder.getOutputs();

    for (const c in outputs.contracts) {
      console.log('Verifying contract:', c);
      try {
        await hre.run('verify:verify', {
          address: outputs.contracts[c].address,
          constructorArguments: outputs.contracts[c].constructorArgs || [],
        });
      } catch (err) {
        if ((err as Error).message.includes('already verified')) {
          console.log('Already verified');
        } else {
          throw err;
        }
      }
    }
  });
