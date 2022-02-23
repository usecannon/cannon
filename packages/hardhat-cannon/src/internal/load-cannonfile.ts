import fs from 'fs';
import toml from '@iarna/toml';
import { HardhatPluginError } from 'hardhat/plugins';
import { ethers } from 'ethers';

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import path from 'path';

export default function loadCannonfile(
  hre: HardhatRuntimeEnvironment,
  filepath: string
) {
  if (!fs.existsSync(filepath)) {
    throw new HardhatPluginError(
      'cannon',
      `Cannon file '${filepath}' not found.`
    );
  }

  const def = toml.parse(fs.readFileSync(filepath).toString('utf8'));

  let pkg: any = {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    pkg = require(path.join(hre.config.paths.root, 'package.json'));
  } catch (err) {
    console.warn(
      'package.json file not found! Cannot use field for cannonfile inference'
    );
  }

  if (!def.name || typeof def.name !== 'string') {
    def.name = pkg.name as string;
    //throw new Error('Invalid "name" property on cannonfile.toml');
  }

  try {
    ethers.utils.formatBytes32String(def.name);
  } catch (err) {
    let msg = 'Invalid "name" property on cannonfile.toml. ';
    if (err instanceof Error) msg += err.message;
    throw new Error(msg);
  }

  if (!def.version || typeof def.version !== 'string') {
    def.version = pkg.version as string;
  }

  try {
    ethers.utils.formatBytes32String(def.version);
  } catch (err) {
    let msg = 'Invalid "version" property on cannonfile.toml. ';
    if (err instanceof Error) msg += err.message;
    throw new Error(msg);
  }

  return def as any;
}
