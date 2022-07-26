import { task } from 'hardhat/config';
import { TASK_EXPORT } from '../task-names';
import { exportPackage } from '@usecannon/cli';

task(TASK_EXPORT, 'Export a Cannon package as a zip archive')
  .addPositionalParam('packageName', 'Name and version of the cannon package to export')
  .addOptionalPositionalParam('outputFile', 'Relative path and filename to export package archive')
  .addOptionalParam('directory', 'Path to a custom package directory', '~/.local/cannon')
  .setAction(async ({ directory, packageName, outputFile }) => {
    await exportPackage(directory, outputFile, packageName);
  });
