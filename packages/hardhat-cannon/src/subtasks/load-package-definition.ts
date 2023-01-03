import { subtask } from 'hardhat/config';

import { SUBTASK_LOAD_PACKAGE_DEFINITION } from '../task-names';
import { PackageSpecification, parsePackageArguments } from '@usecannon/cli';
import loadCannonfile from '../internal/load-cannonfile';
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
      packageSpec = getDefaultPackageDefinition(hre);

      return (packageSpec = packageWithSettingsParams.reduce((result, val) => {
        return parsePackageArguments(val, result);
      }, packageSpec));
    }
  }
);

function getDefaultPackageDefinition(hre: HardhatRuntimeEnvironment): PackageSpecification {
  const { name, version } = loadCannonfile(hre, 'cannonfile.toml');
  return {
    name,
    version,
    settings: {},
  };
}
