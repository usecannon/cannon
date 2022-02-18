import { task } from 'hardhat/config';

import { TASK_PUBLISH } from '../task-names';

task(
  TASK_PUBLISH,
  'Provision and publish to the registry the current Cannonfile.toml'
)
  .addOptionalParam('file', 'Custom cannon deployment file.', 'deploy.json')
  .setAction(async ({ file }, hre) => {
    // TODO: Build Cannonfile.toml
    // TODO: Upload Cannonfile.toml, cache and dependencies to registry
  });
