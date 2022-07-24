import { task } from 'hardhat/config';
import { importPackage } from '@usecannon/cli';
import { TASK_IMPORT } from '../task-names';

task(TASK_IMPORT, 'Read a cannon chain from zip archive')
  .addPositionalParam('file', 'Path to archive previously exported with cannon:export')
  .setAction(async ({ file }, hre) => {
    await importPackage(hre.config.paths.cannon, file);
  });
