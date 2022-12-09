import fs from 'fs-extra';
import path from 'path';
import toml from '@iarna/toml';
import { HardhatPluginError } from 'hardhat/plugins';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers } from 'ethers';
import {
  CANNON_CHAIN_ID,
  ChainBuilderContext,
  validateChainDefinition,
  ChainDefinition,
  RawChainDefinition,
} from '@usecannon/builder';

export default function loadCannonfile(hre: HardhatRuntimeEnvironment, filepath: string) {
  if (!fs.existsSync(filepath)) {
    throw new HardhatPluginError('cannon', `Cannon file '${filepath}' not found.`);
  }

  const rawDef = toml.parse(fs.readFileSync(filepath).toString('utf8'));

  let pkg: any = {};
  try {
    pkg = require(path.join(hre.config.paths.root, 'package.json'));
  } catch (err) {
    console.warn('package.json file not found! Cannot use field for cannonfile inference');
  }

  if (!rawDef.name || typeof rawDef.name !== 'string') {
    rawDef.name = pkg.name as string;
  }

  try {
    ethers.utils.formatBytes32String(rawDef.name);
  } catch (err) {
    let msg = 'Invalid "name" property on cannonfile.toml. ';
    if (err instanceof Error) msg += err.message;
    throw new Error(msg);
  }

  if (!rawDef.version || typeof rawDef.version !== 'string') {
    rawDef.version = pkg.version as string;
  }

  try {
    ethers.utils.formatBytes32String(rawDef.version);
  } catch (err) {
    let msg = 'Invalid "version" property on cannonfile.toml. ';
    if (err instanceof Error) msg += err.message;
    throw new Error(msg);
  }

  if (!validateChainDefinition(rawDef)) {
    console.error('cannonfile failed parse:');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for (const error of validateChainDefinition.errors || []) {
      console.log(`> at .${error.schemaPath}: ${error.message} (${JSON.stringify(error.params)})`);
    }

    throw new Error('failed to parse cannonfile');
  }

  const def = new ChainDefinition(rawDef as RawChainDefinition);

  const ctx: ChainBuilderContext = {
    package: fs.readJsonSync(hre.config.paths.root + '/package.json'),
    chainId: hre.network.config.chainId || CANNON_CHAIN_ID,
    settings: {},
    timestamp: '0',

    contracts: {},
    txns: {},
    imports: {},
    invokes: {},
  };

  const name = def.getName(ctx);
  const version = def.getVersion(ctx);

  return { def, name, version };
}
