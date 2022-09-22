import { task } from 'hardhat/config';
import { TASK_EXPORT } from '../task-names';
import { exportPackage, DEFAULT_CANNON_DIRECTORY } from '@usecannon/cli';

task(TASK_EXPORT, 'Export a Cannon package as a zip archive')
  .addPositionalParam('packageName', 'Name and version of the cannon package to export')
  .addOptionalPositionalParam('outputFile', 'Relative path and filename to export package archive')
  .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .setAction(async ({ directory, packageName, outputFile }, hre) => {
    if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
      directory = hre.config.paths.cannon;
    }

    await exportPackage(directory, outputFile, packageName);
  });
