import fs from 'fs';
import toml from '@iarna/toml';
import { HardhatPluginError } from 'hardhat/plugins';
import { ethers } from 'ethers';

export default function loadCannonfile(filepath: string) {
  if (!fs.existsSync(filepath)) {
    throw new HardhatPluginError(
      'cannon',
      `Cannon file '${filepath}' not found.`
    );
  }

  const def = toml.parse(fs.readFileSync(filepath).toString('utf8'));

  if (!def.name || typeof def.name !== 'string') {
    throw new Error('Invalid "name" property on cannonfile.toml');
  }

  try {
    ethers.utils.formatBytes32String(def.name);
  } catch (err) {
    let msg = 'Invalid "name" property on cannonfile.toml. ';
    if (err instanceof Error) msg += err.message;
    throw new Error(msg);
  }

  if (!def.version || typeof def.version !== 'string') {
    throw new Error('Invalid "version" property on cannonfile.toml');
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
