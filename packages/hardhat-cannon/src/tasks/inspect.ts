import { task } from 'hardhat/config';
import { SUBTASK_LOAD_PACKAGE_DEFINITION, TASK_INSPECT } from '../task-names';
import { inspect, PackageSpecification } from '@usecannon/cli';
import { bold, yellow } from 'chalk';

task(TASK_INSPECT, 'Inspect the details of a Cannon package')
  .addOptionalPositionalParam('packageName', 'Name and version of the cannon package to inspect')
  .addOptionalParam('chainId', 'Chain ID of the variant to inspect')
  .addOptionalParam('preset', 'Preset of the variant to inspect')
  .addOptionalParam('writeDeployments', 'Path to write the deployments data (address and ABIs), like "./deployments"')
  .addFlag('json', 'Output as JSON')
  .setAction(async ({ packageName, json, writeDeployments, chainId, preset }, hre) => {
    const packageSpec: PackageSpecification = await hre.run(SUBTASK_LOAD_PACKAGE_DEFINITION, {
      packageWithSettingsParams: packageName ? [packageName] : [],
    });

    if (!chainId) {
      chainId = hre?.network?.config?.chainId || 13370;
    }

    const packageRef = packageSpec.preset
      ? `${packageSpec.name}:${packageSpec.version}@${packageSpec.preset}`
      : `${packageSpec.name}:${packageSpec.version}`;

    if (packageSpec.preset && preset) {
      console.warn(
        yellow(
          bold(`Duplicate preset definitions in package reference "${packageRef}" and in --preset argument: "${preset}"`)
        )
      );
      console.warn(yellow(bold(`The --preset option is deprecated. Defaulting to package reference "${preset}"...`)));
    }

    const selectedPreset = packageSpec.preset || preset || 'main';

    await inspect(packageRef, chainId, selectedPreset, json, writeDeployments);
  });
