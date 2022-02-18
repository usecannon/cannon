import path from 'path';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export default function readPackageJson(hre: HardhatRuntimeEnvironment) {
  return require(path.resolve(hre.config.paths.root, 'package.json'));
}
