import { task } from 'hardhat/config';
import { SUBTASK_LOAD_PACKAGE_DEFINITION, TASK_INSPECT } from '../task-names';
import { inspect, PackageDefinition, runRpc } from '@usecannon/cli';
task(TASK_INSPECT, 'Inspect the details of a Cannon package')
  .addOptionalPositionalParam('packageName', 'Name and version of the cannon package to inspect')
  .addOptionalParam('writeDeployments', 'Write deployment information to the specified directory')
  .addFlag('json', 'Output as JSON')
  .setAction(async ({ packageName, json, writeDeployments }, hre) => {
    const packageDefinition: PackageDefinition = await hre.run(SUBTASK_LOAD_PACKAGE_DEFINITION, {
      packageWithSettingsParams: packageName ? [packageName] : [],
    });

    const node = await runRpc({
      port: 8545,
    });

    await inspect(
      hre.config.paths.cannon,
      `${packageDefinition.name}:${packageDefinition.version}`,
      json,
      node,
      writeDeployments,
      hre.config.cannon.ipfsEndpoint,
      hre.config.cannon.registryEndpoint,
      hre.config.cannon.registryAddress,
      hre.config.cannon.ipfsAuthorizationHeader
    );
  });
