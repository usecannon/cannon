import { task } from 'hardhat/config';
import { SUBTASK_LOAD_PACKAGE_DEFINITION, TASK_INSPECT } from '../task-names';
import { inspect, PackageSpecification } from '@usecannon/cli';
import { bold, yellow } from 'chalk';
import { PackageReference } from '@usecannon/builder';

task(TASK_INSPECT, 'Inspect the details of a Cannon package')
  .addOptionalPositionalParam('packageName', 'Name and version of the cannon package to inspect')
  .addOptionalParam('chainId', 'Chain ID of the variant to inspect')
  .addOptionalParam('preset', 'Preset of the variant to inspect')
  .addOptionalParam('writeDeployments', 'Path to write the deployments data (address and ABIs), like "./deployments"')
  .addOptionalParam('sources', 'Show contract sources')
  .addFlag('json', 'Output as JSON')
  .setAction(async ({ packageName, json, writeDeployments, chainId, preset: presetArg, sources }, hre) => {
    const packageSpec: PackageSpecification = await hre.run(SUBTASK_LOAD_PACKAGE_DEFINITION, {
      packageWithSettingsParams: packageName ? [packageName] : [],
    });

    if (!chainId) {
      chainId = hre?.network?.config?.chainId || 13370;
    }

    const packageRef = packageSpec.preset
      ? `${packageSpec.name}:${packageSpec.version}@${packageSpec.preset}`
      : `${packageSpec.name}:${packageSpec.version}`;

    let { preset } = new PackageReference(packageRef);

    // Handle deprecated preset specification
    if (presetArg) {
      console.warn(yellow(bold('The --preset option is deprecated. Reference presets in the format name:version@preset')));
    }

    preset = presetArg || packageSpec.preset;

    await inspect(packageRef, chainId, preset, json, writeDeployments, sources);
  });
