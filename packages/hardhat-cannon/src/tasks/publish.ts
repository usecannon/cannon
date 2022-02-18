import { task } from 'hardhat/config';

import { TASK_BUILD, TASK_PUBLISH } from '../task-names';

task(
  TASK_PUBLISH,
  'Provision and publish to the registry the current Cannonfile.toml'
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
    const builder = await hre.run(TASK_BUILD, { label, file, options });

    // console.log()
  });
