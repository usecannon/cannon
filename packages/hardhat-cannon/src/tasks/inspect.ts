import { inspect, PackageSpecification, resolveCliSettings } from '@usecannon/cli';
import { task } from 'hardhat/config';
import { SUBTASK_LOAD_PACKAGE_DEFINITION, TASK_INSPECT } from '../task-names';

task(TASK_INSPECT, 'Inspect the details of a Cannon package')
  .addOptionalPositionalParam('packageName', 'Name and version of the cannon package to inspect')
  .addOptionalParam('chainId', 'Chain ID of the variant to inspect')
  .addOptionalParam('writeDeployments', 'Path to write the deployments data (address and ABIs), like "./deployments"')
  .addOptionalParam('sources', 'Show contract sources')
  .addFlag('json', 'Output as JSON')
  .setAction(async ({ packageName, json, writeDeployments, chainId, sources }, hre) => {
    const packageSpec: PackageSpecification = await hre.run(SUBTASK_LOAD_PACKAGE_DEFINITION, {
      packageWithSettingsParams: packageName ? [packageName] : [],
    });

    const cliSettings = resolveCliSettings();

    if (!chainId) {
      chainId = hre?.network?.config?.chainId || 13370;
    }

    const packageRef = packageSpec.preset
      ? `${packageSpec.name}:${packageSpec.version}@${packageSpec.preset}`
      : `${packageSpec.name}:${packageSpec.version}`;

    await inspect(packageRef, cliSettings, chainId, json, writeDeployments, sources);
  });
