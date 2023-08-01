import { task } from 'hardhat/config';
import { SUBTASK_LOAD_PACKAGE_DEFINITION, TASK_INSPECT } from '../task-names';
import { inspect, PackageSpecification } from '@usecannon/cli';

task(TASK_INSPECT, 'Inspect the details of a Cannon package')
  .addOptionalPositionalParam('packageName', 'Name and version of the cannon package to inspect')
  .addOptionalParam('chainId', 'Chain ID of the variant to inspect')
  .addOptionalParam('preset', 'Preset of the variant to inspect', 'main')
  .addOptionalParam('writeDeployments', 'Path to write the deployments data (address and ABIs), like "./deployments"')
  .addFlag('json', 'Output as JSON')
  .setAction(async ({ packageName, json, writeDeployments, chainId, preset }, hre) => {
    const packageSpec: PackageSpecification = await hre.run(SUBTASK_LOAD_PACKAGE_DEFINITION, {
      packageWithSettingsParams: packageName ? [packageName] : []
    });

    if (!chainId) {
      chainId = hre?.network?.config?.chainId || 13370;
    }

    await inspect(`${packageSpec.name}:${packageSpec.version}`, chainId, preset, json, writeDeployments);
  });
