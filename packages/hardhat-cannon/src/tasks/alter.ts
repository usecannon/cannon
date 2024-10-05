import path from 'node:path';
import { alter, PackageSpecification } from '@usecannon/cli';
import { task } from 'hardhat/config';
import { loadPackageJson } from '../internal/load-pkg-json';
import { SUBTASK_GET_ARTIFACT, SUBTASK_LOAD_PACKAGE_DEFINITION, TASK_ALTER } from '../task-names';

task(TASK_ALTER, 'Make a change to a cannon package outside the regular build process')
  .addPositionalParam('packageRef', 'Name, version, and preset of the cannon package to inspect')
  .addPositionalParam(
    'command',
    'Alteration command to execute. Current options: set-url, set-contract-address, mark-complete'
  )
  .addOptionalVariadicPositionalParam('options', 'Additional options for your alteration command')
  .addOptionalParam('chainId', 'Chain ID of the variant to inspect')
  .addOptionalParam(
    'subpkg',
    'When the change needs to be made in a subpackage, specify the step names leading to the subpackage, comma separated'
  )
  .addOptionalParam('rpcUrl', 'RPC endpoint of the variant to inspect')
  .addOptionalParam('providerUrl', '(DEPRECATED) RPC endpoint of the variant to inspect')
  .setAction(async ({ packageRef, subpkg, chainId, providerUrl, rpcUrl, command, options }, hre) => {
    const packageSpec: PackageSpecification = await hre.run(SUBTASK_LOAD_PACKAGE_DEFINITION, {
      packageWithSettingsParams: packageRef ? [packageRef] : [],
    });
    if (!chainId) {
      chainId = hre?.network?.config?.chainId || 13370;
    }

    await alter(
      `${packageSpec.name}:${packageSpec.version}@${packageSpec.preset}`,
      subpkg.split(',').filter((s: string) => s.length > 0),
      chainId,
      rpcUrl || providerUrl,
      loadPackageJson(path.join(hre.config.paths.root, 'package.json')),
      command,
      options,
      {
        getArtifact: async (n: string) => await hre.run(SUBTASK_GET_ARTIFACT, { name: n }),
      }
    );
  });
