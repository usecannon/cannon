import path from 'node:path';
import { subtask } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { PackageDefinition, parsePackageArguments } from '@usecannon/cli';

import { SUBTASK_LOAD_PACKAGE_DEFINITION } from '../task-names';
import loadCannonfile from '../internal/load-cannonfile';

interface Params {
  cannonfile?: string;
  packageWithSettingsParams: string[];
}

subtask(SUBTASK_LOAD_PACKAGE_DEFINITION).setAction(
  async ({ cannonfile, packageWithSettingsParams }: Params, hre): Promise<PackageDefinition> => {
    if (!cannonfile) {
      cannonfile = path.resolve(hre.config.paths.root, 'cannonfile.toml')
    }

    if (!packageWithSettingsParams || !packageWithSettingsParams.length) {
      return getDefaultPackageDefinition(hre, cannonfile);
    }

    let packageDefinition: PackageDefinition;
    try {
      return packageWithSettingsParams.reduce((result, val) => {
        return parsePackageArguments(val, result);
      }, {} as PackageDefinition);
    } catch (err) {
      packageDefinition = getDefaultPackageDefinition(hre, cannonfile);

      return (packageDefinition = packageWithSettingsParams.reduce((result, val) => {
        return parsePackageArguments(val, result);
      }, packageDefinition));
    }
  }
);

function getDefaultPackageDefinition(hre: HardhatRuntimeEnvironment, cannonfile: string): PackageDefinition {
  const { name, version } = loadCannonfile(hre, cannonfile);
  return {
    name,
    version,
    settings: {},
  };
}
