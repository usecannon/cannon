import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import Debug from 'debug';
import { resolveCliSettings } from '../settings';

const debug = Debug('cannon:cli:clean');

export async function clean() {
  const settings = resolveCliSettings();

  await Promise.all(
    ['tags', 'metadata_cache'].map(async (dir) => {
      const dirname = path.join(settings.cannonDirectory, dir);
      debug(`cleaning directory: ${dirname}`);
      if (!existsSync(dirname)) return;
      await fs.rm(dirname, { recursive: true });
    })
  );
}
