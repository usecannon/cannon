import path from 'path';

import { subtask } from 'hardhat/config';

import { SUBTASK_LOAD_PACKAGE_DEFINITION } from '../task-names';
import { PackageSpecification, parsePackageArguments, loadCannonfile } from '@usecannon/cli';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

subtask(SUBTASK_LOAD_PACKAGE_DEFINITION).setAction(
  async ({ packageWithSettingsParams }: { packageWithSettingsParams: string[] }, hre): Promise<PackageSpecification> => {
    if (!packageWithSettingsParams || !packageWithSettingsParams.length) {
      return getDefaultPackageDefinition(hre);
    }

    let packageSpec: PackageSpecification;
    try {
      return packageWithSettingsParams.reduce((result, val) => {
        return parsePackageArguments(val, result);
      }, {} as PackageSpecification);
    } catch (err) {
      packageSpec = await getDefaultPackageDefinition(hre);

      return (packageSpec = packageWithSettingsParams.reduce((result, val) => {
        return parsePackageArguments(val, result);
      }, packageSpec));
    }
  }
);

async function getDefaultPackageDefinition(hre: HardhatRuntimeEnvironment): Promise<PackageSpecification> {
  const { name, version } = await loadCannonfile(path.join(hre.config.paths.root, 'cannonfile.toml'));
  return {
    name,
    version,
    settings: {}
  };
}
