import { task } from 'hardhat/config';
import { TASK_PACKAGES } from '../task-names';
import { packages } from '@usecannon/cli';

task(TASK_PACKAGES, 'List all packages in the local Cannon directory')
  .addOptionalParam('localCannonDirectory', 'Path to a custom package directory', '~/.local/cannon')
  .setAction(async ({ localCannonDirectory }, hre) => {
    await packages(localCannonDirectory);
  });
