import { task } from 'hardhat/config';
import { TASK_INSPECT } from '../task-names';
import { inspect } from '@usecannon/cli';

task(TASK_INSPECT, 'Inspect the details of a Cannon package')
  .addPositionalParam('packageName', 'Name and version of the cannon package to inspect')
  .addFlag('json', 'Output as JSON')
  .setAction(async ({ packageName, json }, hre) => {
    await inspect(hre.config.paths.cannon, packageName, json);
  });
