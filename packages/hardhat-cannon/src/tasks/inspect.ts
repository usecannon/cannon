import { task } from 'hardhat/config';
import { TASK_INSPECT } from '../task-names';
import { inspect } from '@usecannon/cli';

task(TASK_INSPECT, 'Inspect the details of a Cannon package')
  .addPositionalParam('packageName', 'Name and version of the cannon package to inspect')
  .addFlag('json', 'Output as JSON')
  .addOptionalParam('directory', 'Path to a custom package directory', '~/.local/cannon')
  .setAction(async ({ packageName, directory, json }, hre) => {
    if (directory == '~/.local/cannon' && hre.config.paths.cannon) {
      directory = hre.config.paths.cannon;
    }
    await inspect(directory, packageName, json);
  });
