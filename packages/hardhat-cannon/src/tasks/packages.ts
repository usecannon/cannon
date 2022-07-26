import { task } from 'hardhat/config';
import { TASK_PACKAGES } from '../task-names';
import { packages } from '@usecannon/cli';

task(TASK_PACKAGES, 'List all packages in the local Cannon directory')
  .addOptionalParam('cannonDirectory', 'Path to a custom package directory', '~/.local/cannon')
  .setAction(async ({ cannonDirectory }, hre) => {
    if (cannonDirectory == '~/.local/cannon' && hre.config.paths.cannon) {
      cannonDirectory = hre.config.paths.cannon;
    }
    await packages(cannonDirectory);
  });
