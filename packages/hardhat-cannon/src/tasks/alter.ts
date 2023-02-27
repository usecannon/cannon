import path from 'path';
import { task } from 'hardhat/config';
import { SUBTASK_GET_ARTIFACT, SUBTASK_LOAD_PACKAGE_DEFINITION, TASK_ALTER } from '../task-names';
import { alter, PackageSpecification } from '@usecannon/cli';
import { loadPackageJson } from '../internal/load-pkg-json';

task(TASK_ALTER, 'Make a change to a cannon package outside the regular build process')
  .addPositionalParam('packageName', 'Name and version of the cannon package to inspect')
  .addPositionalParam(
    'command',
    'Alteration command to execute. Current options: set-url, set-contract-address, mark-complete'
  )
  .addOptionalVariadicPositionalParam('options', 'Additional options for your alteration command')
  .addOptionalParam('chainId', 'Chain ID of the variant to inspect')
  .addOptionalParam('preset', 'Preset of the variant to inspect', 'main')
  .setAction(async ({ packageName, chainId, preset, command, options }, hre) => {
    const packageSpec: PackageSpecification = await hre.run(SUBTASK_LOAD_PACKAGE_DEFINITION, {
      packageWithSettingsParams: packageName ? [packageName] : [],
    });

    if (!chainId) {
      chainId = hre?.network?.config?.chainId || 13370;
    }

    await alter(
      `${packageSpec.name}:${packageSpec.version}`,
      chainId,
      preset,
      loadPackageJson(path.join(hre.config.paths.root, 'package.json')),
      command,
      options,
      {
        getArtifact: async (n: string) => await hre.run(SUBTASK_GET_ARTIFACT, { name: n }),
      }
    );
  });
