import { task } from 'hardhat/config';
import { importPackage } from '@usecannon/cli';
import { TASK_IMPORT } from '../task-names';
import { DEFAULT_CANNON_DIRECTORY } from '@usecannon/cli/dist/src/constants';

task(TASK_IMPORT, 'Import a Cannon package from a zip archive')
  .addPositionalParam('importFile', 'Relative path and filename to package archive')
  .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .setAction(async ({ importFile, directory }, hre) => {
    if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
      directory = hre.config.paths.cannon;
    }
    await importPackage(directory, importFile);
  });
