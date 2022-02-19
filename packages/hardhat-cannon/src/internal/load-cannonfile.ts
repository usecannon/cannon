import fs from 'fs';
import toml from '@iarna/toml';
import { HardhatPluginError } from 'hardhat/plugins';

export default function loadCannonfile(filepath: string) {
  if (!fs.existsSync(filepath)) {
    throw new HardhatPluginError(
      'cannon',
      `Cannon file '${filepath}' not found.`
    );
  }

  const def = toml.parse(fs.readFileSync(filepath).toString('utf8'));

  if (!def.name) {
    throw new Error('Missing "name" property on cannonfile.toml');
  }

  if (!def.version) {
    throw new Error('Missing "version" property on cannonfile.toml');
  }

  return def as any;
}
