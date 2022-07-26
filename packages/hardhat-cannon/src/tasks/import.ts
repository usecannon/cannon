import { task } from 'hardhat/config';
import { importPackage } from '@usecannon/cli';
import { TASK_IMPORT } from '../task-names';

task(TASK_IMPORT, 'Import a Cannon package from a zip archive')
  .addPositionalParam('importFile', 'Relative path and filename to package archive')
  .setAction(async ({ importFile }, hre) => {
    await importPackage(hre.config.paths.cannon, importFile);
  });
