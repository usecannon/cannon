import { task } from 'hardhat/config';
import { TASK_PACKAGES } from '../task-names';
import { packages } from '@usecannon/cli';

task(TASK_PACKAGES, 'List all packages in the local Cannon directory')
  .addOptionalParam('directory', 'Path to a custom package directory', '~/.local/cannon')
  .setAction(async ({ directory }, hre) => {
    if (directory == '~/.local/cannon' && hre.config.paths.cannon) {
      directory = hre.config.paths.cannon;
    }
    await packages(directory);
  });
