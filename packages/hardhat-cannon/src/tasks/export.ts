import { task } from 'hardhat/config';
import { SUBTASK_LOAD_PACKAGE_DEFINITION, TASK_EXPORT } from '../task-names';
import { exportPackage, DEFAULT_CANNON_DIRECTORY, PackageDefinition } from '@usecannon/cli';

task(TASK_EXPORT, 'Export a Cannon package as a zip archive')
  .addPositionalParam('outputFile', 'Relative path and filename to export package archive')
  .addOptionalParam('packageName', 'Name and version of the cannon package to export')
  .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .setAction(async ({ directory, packageName, outputFile }, hre) => {
    if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
      directory = hre.config.paths.cannon;
    }

    const packageDefinition: PackageDefinition = await hre.run(SUBTASK_LOAD_PACKAGE_DEFINITION, { packageWithSettingsParams: packageName ? [packageName] : [] });

    await exportPackage(directory, outputFile, `${packageDefinition.name}:${packageDefinition.version}`);
  });
