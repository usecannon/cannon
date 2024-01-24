import path from 'node:path';
import { loadCannonfile, PackageSpecification, parsePackageArguments } from '@usecannon/cli';
import { subtask } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { SUBTASK_LOAD_PACKAGE_DEFINITION } from '../task-names';

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
    settings: {},
  };
}
