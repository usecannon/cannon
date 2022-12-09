import { subtask } from 'hardhat/config';

import { SUBTASK_LOAD_PACKAGE_DEFINITION } from '../task-names';
import { PackageDefinition, parsePackageArguments } from '@usecannon/cli';
import loadCannonfile from '../internal/load-cannonfile';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

subtask(SUBTASK_LOAD_PACKAGE_DEFINITION).setAction(
  async ({ packageWithSettingsParams }: { packageWithSettingsParams: string[] }, hre): Promise<PackageDefinition> => {
    if (!packageWithSettingsParams || !packageWithSettingsParams.length) {
      return getDefaultPackageDefinition(hre);
    }

    let packageDefinition: PackageDefinition;
    try {
      return packageWithSettingsParams.reduce((result, val) => {
        return parsePackageArguments(val, result);
      }, {} as PackageDefinition);
    } catch (err) {
      packageDefinition = getDefaultPackageDefinition(hre);

      return (packageDefinition = packageWithSettingsParams.reduce((result, val) => {
        return parsePackageArguments(val, result);
      }, packageDefinition));
    }
  }
);

function getDefaultPackageDefinition(hre: HardhatRuntimeEnvironment): PackageDefinition {
  const { name, version } = loadCannonfile(hre, 'cannonfile.toml');
  return {
    name,
    version,
    settings: {},
  };
}
