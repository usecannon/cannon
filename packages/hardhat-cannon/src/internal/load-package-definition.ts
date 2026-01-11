import path from 'node:path';
import { loadCannonfile, PackageSpecification, parsePackageArguments } from '@usecannon/cli';
import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';

export default async function loadPackageDefinition({ packageWithSettingsParams }: { packageWithSettingsParams: string[] }, hre: HardhatRuntimeEnvironment): Promise<PackageSpecification> {
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

async function getDefaultPackageDefinition(hre: HardhatRuntimeEnvironment): Promise<PackageSpecification> {
  const { name, version } = await loadCannonfile(path.join(hre.config.paths.root, 'cannonfile.toml'));
  return {
    name,
    version,
    settings: {},
  };
}
